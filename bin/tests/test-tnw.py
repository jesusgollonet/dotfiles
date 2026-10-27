import os
from pathlib import Path
import subprocess
import tempfile
import fcntl
import pty
import select
import struct
import termios
import time

SCRIPT = Path(os.environ.get('TNW_TEST_SCRIPT', str(Path(__file__).resolve().parents[1] / 'tnw')))
CONFIG = Path(os.environ.get('TNW_TEST_CONFIG', str(Path(__file__).resolve().parents[2] / 'tmux/tmux.conf')))

def run(*args, **kwargs):
    result = subprocess.run(args, text=True, capture_output=True, **kwargs)
    if result.returncode:
        raise RuntimeError(f'{args}: {result.stderr}')
    return result.stdout.strip()

with tempfile.TemporaryDirectory(prefix='tnw-test-') as temp:
    root = Path(temp).resolve()
    repo = root / 'project with spaces'
    repo.mkdir()
    run('git', 'init', '-q', str(repo))
    run('git', '-C', str(repo), '-c', 'user.name=Test', '-c', 'user.email=test@example.test',
        'commit', '--allow-empty', '-qm', 'Initial')
    (repo / 'uncommitted.txt').write_text('Stay in the original checkout')
    socket = str(root / 'tmux.sock')

    def tmux(*args):
        return run('tmux', '-S', socket, *args)

    try:
        tmux('-f', '/dev/null', 'new-session', '-d', '-s', 'prototype', '-x', '120', '-y', '40',
             '-c', str(repo), 'sleep 300')
        pane = tmux('display-message', '-p', '-t', 'prototype:', '#{pane_id}')
        env = dict(os.environ, TMUX=f'{socket},0,0', TMUX_PANE=pane,
                   TNW_EDITOR='/nonexistent/editor', TNW_AGENT='/nonexistent/agent')

        def launch(name, cwd=repo, success=True):
            result = subprocess.run(['bash', str(SCRIPT), '--pane', pane, name],
                                    cwd=cwd, env=env, text=True, capture_output=True)
            assert (result.returncode == 0) == success, result.stdout + result.stderr
            return result

        tmux('set-option', '-g', 'default-shell', '/bin/sh')
        launch('fix-login')
        worktree = Path(str(repo) + '.worktrees') / 'fix-login'
        assert run('git', '-C', str(worktree), 'branch', '--show-current') == 'fix-login'
        assert not (worktree / 'uncommitted.txt').exists()
        assert (repo / 'uncommitted.txt').exists()
        assert tmux('display-message', '-p', '-t', 'prototype:', '#{window_name}') == 'fix-login'
        paths = tmux('list-panes', '-t', 'prototype:fix-login', '-F', '#{pane_current_path}').splitlines()
        assert paths == [str(worktree), str(worktree)], paths
        commands = tmux('list-panes', '-t', 'prototype:fix-login', '-F', '#{pane_start_command}').splitlines()
        assert not any(commands), commands
        assert tmux('show-options', '-wv', '-t', 'prototype:fix-login', 'automatic-rename') == 'off'
        assert tmux('show-options', '-wv', '-t', 'prototype:fix-login', 'allow-rename') == 'off'
        assert tmux('show-options', '-wv', '-t', 'prototype:fix-login', '@worktree_path') == str(worktree)
        launch('feature/nested', cwd=worktree)
        nested = Path(str(repo) + '.worktrees') / 'feature/nested'
        assert nested.is_dir()
        assert run('git', '-C', str(nested), 'branch', '--show-current') == 'feature/nested'
        count = tmux('list-windows', '-t', 'prototype', '-F', '#{window_id}')
        launch('fix-login', success=False)
        launch('../escape', success=False)
        launch('oops;touch injected', success=False)
        launch('new-branch', cwd=root, success=False)
        collision = Path(str(repo) + '.worktrees') / 'collision'
        collision.mkdir()
        launch('collision', success=False)
        assert subprocess.run(['git', '-C', str(repo), 'show-ref', '--verify', '--quiet',
                               'refs/heads/collision']).returncode != 0
        assert count == tmux('list-windows', '-t', 'prototype', '-F', '#{window_id}')
        tmux('source-file', str(CONFIG))
        binding = tmux('list-keys', '-T', 'prefix')
        assert 'tnw' in binding and '--pane' in binding, binding
        # Exercise the actual keyboard shortcut through an attached terminal.
        # Checking the parsed binding alone misses popup argument expansion bugs.
        master, slave = pty.openpty()
        fcntl.ioctl(slave, termios.TIOCSWINSZ, struct.pack('HHHH', 40, 120, 0, 0))
        client = subprocess.Popen(['tmux', '-S', socket, 'attach', '-t', 'prototype'],
                                  stdin=slave, stdout=slave, stderr=slave,
                                  env=dict(os.environ, TERM='xterm-256color'))
        try:
            time.sleep(.3)
            def open_popup():
                while select.select([master], [], [], 0)[0]:
                    os.read(master, 65536)
                os.write(master, b'`W')
                screen = b''
                deadline = time.monotonic() + 5
                while time.monotonic() < deadline:
                    if select.select([master], [], [], .1)[0]:
                        screen += os.read(master, 65536)
                    if b'New worktree branch' in screen:
                        break
                assert b'New worktree branch' in screen, repr(screen[-2000:])

            before_cancel = tmux('list-windows', '-t', 'prototype', '-F', '#{window_id}')
            before_trees = run('git', '-C', str(repo), 'worktree', 'list', '--porcelain')
            for cancel in (b'\x1b', b'\x03', b'\x04', b'\x15\r'):
                open_popup()
                os.write(master, b'cancel-this-branch')
                time.sleep(.1)
                os.write(master, cancel)
                screen = b''
                deadline = time.monotonic() + .6
                while time.monotonic() < deadline:
                    if select.select([master], [], [], .1)[0]:
                        screen += os.read(master, 65536)
                assert b'Press Enter to close' not in screen, repr(screen)
                assert b'returned ' not in screen, repr(screen)
                assert before_cancel == tmux('list-windows', '-t', 'prototype', '-F', '#{window_id}')
                assert before_trees == run('git', '-C', str(repo), 'worktree', 'list', '--porcelain')
            open_popup()
            # Give the popup enough time to expose an immediate-exit regression.
            time.sleep(.4)
            # Arrows must not cancel or add escape bytes; backspace edits the name.
            os.write(master, b'popup-tesx\x7ft\x1b[A\r')
            popup_tree = Path(str(repo) + '.worktrees') / 'popup-test'
            deadline = time.monotonic() + 5
            while time.monotonic() < deadline:
                panes = tmux('list-panes', '-t', 'prototype:', '-F', '#{pane_current_path}').splitlines()
                if panes == [str(popup_tree), str(popup_tree)]:
                    break
                time.sleep(.1)
            assert panes == [str(popup_tree), str(popup_tree)], panes
            assert tmux('display-message', '-p', '-t', 'prototype:', '#{window_name}') == 'popup-test'
        finally:
            tmux('detach-client', '-s', 'prototype')
            # The PTY may be full of screen updates; don't wait on its final redraw.
            client.kill()
            client.wait(timeout=5)
            os.close(master)
            os.close(slave)
        print('PASS: branch/worktree creation, two panes, paths with spaces, stable window titles, '
              'nested names, invocation from worktrees, dirty checkout preservation, '
              'duplicate/invalid names, path collisions, popup cancellation with Escape/Ctrl-C/'
              'Ctrl-D/empty input, and interactive popup editing/submission')
    finally:
        subprocess.run(['tmux', '-S', socket, 'kill-server'], capture_output=True)
