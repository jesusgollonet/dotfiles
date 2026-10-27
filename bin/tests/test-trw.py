"""Exercise safe cleanup in an isolated repository and tmux server."""
import fcntl
import os
from pathlib import Path
import pty
import select
import struct
import subprocess
import tempfile
import termios
import time

BIN = Path(__file__).resolve().parents[1]


def run(*args, **kwargs):
    result = subprocess.run(args, text=True, capture_output=True, **kwargs)
    assert result.returncode == 0, result.stdout + result.stderr
    return result.stdout.strip()


with tempfile.TemporaryDirectory(prefix='trw-test-') as temp:
    root = Path(temp).resolve()
    repo = root / 'repo with spaces'
    repo.mkdir()
    run('git', 'init', '-q', str(repo))
    run('git', '-C', str(repo), '-c', 'user.name=Test', '-c', 'user.email=test@example.test',
        'commit', '--allow-empty', '-qm', 'Initial')
    socket = str(root / 'tmux.sock')

    def tmux(*args):
        return run('tmux', '-S', socket, *args)

    try:
        tmux('-f', '/dev/null', 'new-session', '-d', '-s', 'cleanup', '-x', '120', '-y', '40',
             '-c', str(repo))
        tmux('set-option', '-g', 'default-shell', '/bin/sh')
        pane = tmux('display-message', '-p', '-t', 'cleanup:', '#{pane_id}')
        original = tmux('display-message', '-p', '-t', pane, '#{window_id}')
        env = dict(os.environ, TMUX=f'{socket},0,0', TMUX_PANE=pane)
        run('bash', str(BIN / 'tnw'), '--pane', pane, 'cleanup-test', cwd=repo, env=env)
        window = tmux('display-message', '-p', '-t', 'cleanup:', '#{window_id}')
        tree = Path(str(repo) + '.worktrees') / 'cleanup-test'

        def cleanup(answer='y', target=window, error=None):
            result = subprocess.run(['bash', str(BIN / 'trw'), '--window', target],
                                    env=env, input=answer, text=True, capture_output=True)
            if error:
                assert result.returncode != 0, result.stdout + result.stderr
                assert error in result.stderr, result.stderr
            else:
                assert result.returncode == 0, result.stdout + result.stderr
            assert tree.is_dir()
            assert window in tmux('list-windows', '-t', 'cleanup', '-F', '#{window_id}').splitlines()

        cleanup(target=original, error='not created by tnw')
        for answer in ('n', '\x1b', '\n', ''):
            cleanup(answer)
        dirty = tree / 'untracked.txt'
        dirty.write_text('preserve me')
        cleanup(error='changed, untracked, or ignored')
        run('git', '-C', str(tree), 'add', 'untracked.txt')
        cleanup(error='changed, untracked, or ignored')
        run('git', '-C', str(tree), '-c', 'user.name=Test', '-c', 'user.email=test@example.test',
            'commit', '-qm', 'Work only on this branch')
        dirty.write_text('uncommitted changes')
        cleanup(error='changed, untracked, or ignored')
        dirty.write_text('preserve me')
        (repo / '.git/info/exclude').write_text('local.secret\n')
        ignored = tree / 'local.secret'
        ignored.write_text('preserve ignored files too')
        cleanup(error='changed, untracked, or ignored')
        ignored.unlink()
        other = tmux('new-window', '-d', '-P', '-F', '#{window_id}', '-t', 'cleanup:', '-c', str(tree))
        cleanup(error='another tmux window')
        tmux('kill-window', '-t', other)
        target_pane = tmux('list-panes', '-t', window, '-F', '#{pane_id}').splitlines()[0]
        tmux('send-keys', '-t', target_pane, 'sleep 300 &', 'Enter')
        time.sleep(.3)
        cleanup(error='running child processes')
        tmux('send-keys', '-t', target_pane, 'kill %1; wait', 'Enter')
        time.sleep(.3)
        tmux('send-keys', '-t', target_pane, 'sleep 300', 'Enter')
        time.sleep(.3)
        cleanup(error='pane is running')
        tmux('send-keys', '-t', target_pane, 'C-c')
        time.sleep(.3)
        run('git', '-C', str(tree), 'checkout', '-qb', 'changed-branch')
        cleanup(error='checked-out branch has changed')
        run('git', '-C', str(tree), 'checkout', '-q', 'cleanup-test')
        run('git', '-C', str(repo), 'worktree', 'lock', str(tree))
        cleanup(error='locked')
        run('git', '-C', str(repo), 'worktree', 'unlock', str(tree))

        # Use the real shortcut to verify confirmation, Escape and successful cleanup.
        tmux('source-file', str(BIN.parent / 'tmux/tmux.conf'))
        tmux('select-window', '-t', window)
        master, slave = pty.openpty()
        fcntl.ioctl(slave, termios.TIOCSWINSZ, struct.pack('HHHH', 40, 120, 0, 0))
        client = subprocess.Popen(['tmux', '-S', socket, 'attach', '-t', 'cleanup'],
                                  stdin=slave, stdout=slave, stderr=slave,
                                  env=dict(os.environ, TERM='xterm-256color'))
        try:
            time.sleep(.3)

            def confirm():
                while select.select([master], [], [], 0)[0]:
                    os.read(master, 65536)
                os.write(master, b'`X')
                screen = b''
                deadline = time.monotonic() + 5
                while time.monotonic() < deadline:
                    if select.select([master], [], [], .1)[0]:
                        screen += os.read(master, 65536)
                    if b'Remove? [y/N]' in screen:
                        return
                raise AssertionError(repr(screen[:6000]))

            for cancel in (b'\x1b', b'\x03'):
                confirm()
                os.write(master, cancel)
                time.sleep(1)
                assert tree.is_dir()
            confirm()
            os.write(master, b'y')
            deadline = time.monotonic() + 5
            while time.monotonic() < deadline:
                windows = tmux('list-windows', '-t', 'cleanup', '-F', '#{window_id}').splitlines()
                if window not in windows:
                    break
                time.sleep(.1)
            assert window not in windows, windows
            assert not tree.exists()
            assert str(tree) not in run('git', '-C', str(repo), 'worktree', 'list', '--porcelain')
            run('git', '-C', str(repo), 'show-ref', '--verify', 'refs/heads/cleanup-test')
            assert run('git', '-C', str(repo), 'show', 'cleanup-test:untracked.txt') == 'preserve me'
        finally:
            client.kill()
            client.wait(timeout=5)
            os.close(master)
            os.close(slave)
        print('PASS: cleanup confirmation/cancellation, dirty/staged/untracked/ignored protection, '
              'background jobs, other windows, locked worktrees, branch/commit preservation, '
              'and actual tmux cleanup shortcut')
    finally:
        subprocess.run(['tmux', '-S', socket, 'kill-server'], capture_output=True)
