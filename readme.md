# Dotfiles

## Docs
- [Vim](vim.md) - plugins, keybindings, and shortcuts

## How to install
- clone this repo
- move to `~/.dotfiles` (paths are currently hardcoded)
```bash

# (from the repo)
brew bundle 

cd ~

# symlink dotflies

ln -s ~/.dotfiles/zsh/zshrc .zshrc

ln -s ~/.dotfiles/zsh/zshenv .zshenv

ln -s ~/.dotfiles/git/gitconfig .gitconfig

ln -s ~/.dotfiles/tmux/tmux.conf .tmux.conf

# install vim-plug then all vim plugins

curl -fLo ~/.vim/autoload/plug.vim --create-dirs https://raw.githubusercontent.com/junegunn/vim-plug/master/plug.vim

ln -s ~/.dotfiles/vim/vimrc .vimrc
ln -s ~/.dotfiles/vim/coc-settings.json ~/.vim/coc-settings.json

vim -c PlugInstall
```

## Local config
Identity, work paths and secrets stay out of the repo, in untracked files that are loaded if present:
- `~/.gitconfig.local` — `[user]` name/email, `includeIf` for work dirs
- `~/.zshrc.local` — env vars (e.g. `NTFY_TOPIC`) and machine-specific functions
- `~/.vimrc.local` — vim settings, e.g. `g:dotfiles_tree_root_markers` for the F3 tree
- `~/.vim/secrets.vim` — vim-only secrets

## ttf (time to first)
`bin/ttf` jumps to a project's tmux session, or creates it, starts the dev server and opens the browser once the server prints a URL.
- `ttf <project>`: attach or switch (`ttf` alone uses the current dir, unknown names fall back to zoxide like `zt`)
- `ttf list`: projects and running sessions
- `ttf open <project> --no-server | --no-browser | --detach`

Project roots are kept out of the repo, in `~/.config/ttf/roots` (one dir per line) or `$TTF_ROOTS` (colon-separated).
Sessions use the same names as `tnn`/`zt`, and `.tmux.project` still sets the layout. It can also set `TTF_SERVER="..."` (or `TTF_SERVER=""` for none); otherwise `npm run dev` runs when `package.json` has a dev script.

`raycast/ttf` is the Raycast front end: `cd raycast/ttf && npm install && npm run dev` once to import it into Raycast.
