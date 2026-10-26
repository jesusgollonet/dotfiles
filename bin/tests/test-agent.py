import json
import os
from pathlib import Path
import subprocess
import tempfile
import time

ROOT = Path(__file__).resolve().parents[2]
SEND = ROOT / 'bin/agent-send'
REPLY = ROOT / 'bin/vim-reply'
PLUGIN = ROOT / 'vim/agent.vim'

def run(*args, **kwargs):
    result = subprocess.run(args, text=True, capture_output=True, **kwargs)
    if result.returncode:
        raise RuntimeError(f'{args}: {result.stderr}')
    return result.stdout.strip()

def wait_for(predicate, timeout=5):
    deadline = time.time() + timeout
    while time.time() < deadline:
        if predicate():
            return
        time.sleep(0.05)
    raise AssertionError('timed out')

with tempfile.TemporaryDirectory(prefix='agent-test-') as temp:
    root = Path(temp).resolve()
    socket = str(root / 'tmux.sock')
    cache = root / 'cache'

    def tmux(*args):
        return run('tmux', '-S', socket, *args)

    # agent-send: pastes into the pane to the right and submits it.
    try:
        tmux('-f', '/dev/null', 'new-session', '-d', '-s', 'test', '-x', '120', '-y', '40', 'sleep 300')
        editor = tmux('display-message', '-p', '-t', 'test:', '#{pane_id}')
        out = root / 'agent.txt'
        agent = tmux('split-window', '-h', '-P', '-F', '#{pane_id}', '-t', editor, f"stty -echo; cat > '{out}'")
        # A pane below the editor must not be picked over the one to the right.
        tmux('split-window', '-v', '-t', editor, 'sleep 300')
        env = dict(os.environ, TMUX=f'{socket},0,0', AGENT_SEND_DELAY='0.1')
        env.pop('AGENT_PANE', None)
        message = 'first line\nsecond line'
        result = subprocess.run(['bash', str(SEND), '--from', editor], input=message,
                                env=env, text=True, capture_output=True)
        assert result.returncode == 0, result.stderr
        assert result.stdout.strip() == agent, result.stdout
        wait_for(lambda: out.exists() and out.read_text() == message + '\n')

        # With nothing to the right and several other panes, refuse to guess.
        result = subprocess.run(['bash', str(SEND), '--from', agent], input='hi',
                                env=env, text=True, capture_output=True)
        assert result.returncode != 0 and 'no agent pane' in result.stderr, result.stderr
        result = subprocess.run(['bash', str(SEND), '--from', editor], input='',
                                env=env, text=True, capture_output=True)
        assert result.returncode != 0 and 'empty message' in result.stderr, result.stderr
    finally:
        subprocess.run(['tmux', '-S', socket, 'kill-server'], capture_output=True)

    # vim-reply: stdin or arguments, written atomically under the cache dir.
    env = dict(os.environ, XDG_CACHE_HOME=str(cache))
    replies = cache / 'vim-agent/replies'
    run('bash', str(REPLY), 'abc123', input='**It is a Map.**\n', env=env)
    assert (replies / 'abc123.md').read_text() == '**It is a Map.**\n'
    run('bash', str(REPLY), '#beef01', 'short', 'answer', env=env)
    assert (replies / 'beef01.md').read_text() == 'short answer\n'
    for bad in (['../x'], ['abc123']):
        result = subprocess.run(['bash', str(REPLY), *bad], input='', env=env, text=True, capture_output=True)
        assert result.returncode != 0, bad
    assert sorted(p.name for p in replies.iterdir()) == ['abc123.md', 'beef01.md']

    # Vim: message contents, pending/answered virtual text, follow-ups.
    source = root / 'sample.ts'
    source.write_text('const a = 1\n  const m = new Map()\n  m.set(a, 2)\nexport {}\n')
    sent = root / 'sent.txt'
    result_file = root / 'result.json'
    script = root / 'test.vim'
    script.write_text(f'''
let g:agent_send_cmd = 'cat > {sent}'
filetype on
source {PLUGIN}
edit {source}
let r = {{}}
try
  let id = AgentAsk(AgentContext(2, 3, 'V'), 'what type is m?')
  let r.id = id
  let r.pending = map(prop_list(3), {{_, p -> get(p, 'text', '')}})
  call system('XDG_CACHE_HOME={cache} bash {REPLY} ' . id, "Map<number, number>\\n\\n")
  call AgentPoll()
  let r.answered = map(prop_list(3), {{_, p -> get(p, 'text', '')}})
  let r.parent = AgentContext(3, 3, '').parent
  let r.fresh = AgentContext(1, 1, '').parent
  edit!
  let r.restored = map(prop_list(3), {{_, p -> get(p, 'text', '')}})
catch
  let r.error = v:exception . ' ' . v:throwpoint
endtry
call writefile([json_encode(r)], '{result_file}')
qa!
''')
    subprocess.run(['vim', '-Nu', 'NONE', '-i', 'NONE', '-es', '-S', str(script)],
                   env=dict(os.environ, XDG_CACHE_HOME=str(cache), TMUX_PANE=''), timeout=20)
    r = json.loads(result_file.read_text())
    assert 'error' not in r, r['error']
    id = r['id']
    message = sent.read_text()
    assert message.startswith(f'[vim #{id}] {source}:2-3\n\nwhat type is m?\n\n```typescript\n'), message
    assert '  const m = new Map()\n  m.set(a, 2)\n```' in message, message
    assert f'`vim-reply {id}`' in message, message
    # prop_list() lists virtual text newest first; Vim draws it oldest first.
    texts = lambda key: [t for t in reversed(r[key]) if t]
    assert texts('pending') == [f'  ⋯ #{id} what type is m?'], r['pending']
    expected = [f'  ╭ #{id} what type is m?', '  │ Map<number, number>', '  ╰']
    assert texts('answered') == expected, r['answered']
    assert texts('restored') == expected, r['restored']
    assert r['parent'] == id and r['fresh'] == '', r

print('ok')
