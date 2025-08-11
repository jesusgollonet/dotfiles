# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository Overview

This is a personal dotfiles repository containing shell configurations, custom scripts, and system setup tools for macOS development environment.

## Key Architecture

This dotfiles setup follows a **progressive enhancement** and **context-aware** design philosophy:

### Modular Configuration Pattern
- **`zshenv`**: Loaded for all shells (including vim), contains aliases and essential PATH setup for universal access
- **`zshrc`**: Interactive shell configuration that sources modular components (`keys`, `functions`, `setopt`)
- **Separation strategy**: Ensures vim command mode works with aliases while maintaining clean interactive shell setup

### Integration Philosophy
Tools are designed to **complement rather than replace** each other:
- **fzf + ag + z**: Unified search and navigation (fuzzy finding, git-aware filtering, frecency-based jumping)
- **tmux + vim + git**: Seamless workflow transitions with consistent key bindings
- **Package managers**: Multiple ecosystems (Homebrew, npm, pyenv, nvm) coordinated through conditional loading

### Context-Aware Behaviors
- **Tmux integration**: Different key bindings and behaviors inside vs outside tmux sessions
- **Project-specific configs**: `.tmux.project` pattern allows per-project session customization
- **Dynamic session coloring**: Each tmux session gets unique colors from `/tmux/config/colours`

## Installation and Setup Commands

The installation follows a **layered dependency model**:

```bash
# Complete system setup (orchestrates all package managers)
./install

# Individual package manager steps:
brew bundle                           # System tools and applications
bash install-npm-global-packages     # Development utilities (prettier, eslint)

# Manual symlink step (after cloning to ~/.dotfiles):
ln -s ~/.dotfiles/zsh/zshrc ~/.zshrc
ln -s ~/.dotfiles/zsh/zshenv ~/.zshenv
ln -s ~/.dotfiles/git/gitconfig ~/.gitconfig
ln -s ~/.dotfiles/tmux/tmux.conf ~/.tmux.conf
ln -s ~/.dotfiles/vim/vimrc ~/.vimrc

# Reload configuration
source ~/.zshrc  # or use the 's' alias
```

## Workflow Integration & Key Functions

### Unified Development Interface
The configuration creates a **seamless workflow** through integrated tools:

**Navigation & Search:**
- **fzf + ag**: Git-aware fuzzy finding with `FZF_DEFAULT_COMMAND` excluding `.git` directories
- **z command**: Frecency-based directory jumping (frequency + recency)
- **Custom functions**: `sketch()` (timestamped projects), `take()` (mkdir+cd), `gi()` (gitignore templates)

**Git Workflow:**
- `Ctrl+G` → lazygit (visual git interface)
- `Ctrl+W` → GitHub web view via `gh` CLI  
- `Ctrl+L` → GitHub issues list
- Comprehensive git aliases: `g`, `gs`, `ga`, `gp`, `gl`, `gd`, `gco`, `gc`

**Session Management:**
- `F7/F9` → Attach to tmux session
- `F8` → List tmux sessions  
- `F12` → Foreground vim or open new instance
- **`tnn()` function**: Intelligent session creation with `.tmux.project` support

### Composable Utility Scripts (/bin/)
Following **Unix philosophy** of small, chainable tools:
- **`in` & `in_split`**: Directory-scoped command execution (local vs tmux split)
- **`new_project`**: Project structure creation (dev/doc/test folders)
- **`note`**: Structured note creation with frontmatter for static site generators
- **`tmux_mini_split`**: Quick tmux pane creation for monitoring commands

## Package Management Coordination

**PATH precedence**: Local bins (`~/.bin`, `~/.dotfiles/bin`) come first, followed by language-specific paths

**Conditional loading pattern**: Each package manager only loads if installed:
- **Homebrew**: System tools and applications (`Brewfile`)
- **npm**: Development utilities (`install-npm-global-packages`)
- **Language managers**: pyenv, nvm, pnpm, bun, deno (isolated ecosystems)

**Graceful degradation**: Core functionality works without optional dependencies

## Command Aliases & Shortcuts

**System navigation**: `l` (ls -laG), `..`, `...`, `c` (pbcopy), `p` (pbpaste), `s` (source ~/.zshrc)
**Docker workflow**: `d`, `di`, `dps`, `db`, `dr`  
**Terraform**: `tf`, `tfi`, `tfp`, `tfa`, `tfd`
**Notification**: `notify()` (terminal-notifier + ntfy integration)

## Tmux Session Management

**`.tmux.project` pattern**: Project-specific session configuration
- Default: 2 windows with split panes
- Custom colors from `/tmux/config/colours` based on session ID
- Integration with `tnn()` function for intelligent session creation

## Development Workflow Notes

When modifying shell configuration:
- Changes to `zshenv`: Available immediately in vim and new shells
- Changes to `zshrc`: Requires `source ~/.zshrc` or `s` alias
- Tmux changes: May require `tmux source-file ~/.tmux.conf`

**Editor integration**: Homebrew vim (not system vim) ensures consistent plugin ecosystem and PATH access to all aliases.