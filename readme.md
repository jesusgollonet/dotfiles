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

vim -c PlugInstall
```

## Local config
Identity, work paths and secrets stay out of the repo, in untracked files that are loaded if present:
- `~/.gitconfig.local` — `[user]` name/email, `includeIf` for work dirs
- `~/.zshrc.local` — env vars (e.g. `NTFY_TOPIC`) and machine-specific functions
- `~/.vimrc.local` — vim settings, e.g. `g:dotfiles_tree_root_markers` for the F3 tree
- `~/.vim/secrets.vim` — vim-only secrets
