# Dotfiless

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
