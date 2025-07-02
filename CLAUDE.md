# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository Overview

This is a personal dotfiles repository containing shell configurations, custom scripts, and system setup tools for macOS development environment.

## Key Architecture

- **Shell Configuration**: Primary shell is zsh with modular configuration split across `/zsh/` directory
- **Custom Scripts**: Utility scripts in `/bin/` directory for common development tasks
- **System Setup**: Automated installation scripts using Homebrew and npm
- **Tmux Configuration**: Custom tmux setup with color schemes and session management

## Installation and Setup Commands

```bash
# Initial system setup (installs Xcode CLI tools, Homebrew packages, npm globals)
./install

# Install Homebrew packages only
brew bundle

# Install npm global packages only
bash install-npm-global-packages

# Symlink dotfiles (manual step after cloning to ~/.dotfiles)
ln -s ~/.dotfiles/zsh/zshrc ~/.zshrc
ln -s ~/.dotfiles/zsh/zshenv ~/.zshenv
ln -s ~/.dotfiles/git/gitconfig ~/.gitconfig
ln -s ~/.dotfiles/tmux/tmux.conf ~/.tmux.conf
ln -s ~/.dotfiles/vim/vimrc ~/.vimrc
```

## Custom Shell Functions and Key Bindings

**Important custom functions:**
- `sketch()` - Creates timestamped project folders in ~/Sketch
- `take()` - mkdir + cd in one command
- `gi()` - Fetch gitignore templates from gitignore.io
- `notify()` - Send notifications via terminal-notifier and ntfy

**Key bindings:**
- `Ctrl+G` - Launch lazygit
- `Ctrl+W` - Open GitHub repo in web browser
- `Ctrl+L` - List GitHub issues
- `F7/F9` - Attach to tmux session
- `F8` - List tmux sessions
- `F12` - Foreground vim or open new instance

## Path Configuration

The shell adds these directories to PATH:
- `~/.bin` - Personal binary directory
- `~/.dotfiles/bin` - Dotfiles utility scripts
- Various language-specific paths (pyenv, nvm, pnpm, bun, deno)

## Aliases and Shortcuts

**Git aliases**: `g`, `gs`, `ga`, `gp`, `gl`, `gd`, `gco`, `gc`, etc.
**Docker aliases**: `d`, `di`, `dps`, `db`, `dr`, etc.  
**Terraform aliases**: `tf`, `tfi`, `tfp`, `tfa`, `tfd`
**System**: `l` (ls -laG), `..`, `...`, `c` (pbcopy), `p` (pbpaste)

## Development Environment

**Editor**: vim (Homebrew version) with vim-plug plugin manager
**Terminal multiplexer**: tmux with custom configuration
**Package managers**: Homebrew, npm, pyenv, nvm, pnpm, bun
**Version control**: Git with gh CLI integration
**Search tools**: fzf with ag (silver searcher) integration

## Custom Scripts in /bin/

- `new_project` - Create project structure with dev/doc/test folders
- `note` - Note-taking utility
- `tmux_mini_split` - Tmux session management
- `in` / `in_split` - Directory-based command execution utilities

When making changes to shell configuration, remember to source the changes with `source ~/.zshrc` or use the `s` alias.