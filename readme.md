# Dotfiless

## How to install
- clone this repo
- move to `~/.dotfiles` (paths are currently hardcoded)
- ```bash

# (from the repo)
brew bundle 
cd ~
# symlink zshrc 
ln -s ~/.dotfiles/zsh/zshrc .zshrc
ln -s ~/.dotfiles/git/gitconfig .gitconfig
ln -s ~/.dotfiles/vim/vimrc .vimrc
ln -s ~/.dotfiles/vim/vimrc .vimrc

# install vim-plug then all vim plugins
curl -fLo ~/.vim/autoload/plug.vim --create-dirs https://raw.githubusercontent.com/junegunn/vim-plug/master/plug.vim
vim -c PlugInstall

```




