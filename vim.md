# Vim

## Plugins

### Syntax & Language Support
- **vim-javascript** (`pangloss`) - JS syntax
- **vim-vue** (`posva`) - Vue SFC support
- **vim-svelte** (`evanleck`) - Svelte support
- **vim-processing** (`sophacles`) - Processing IDE integration
- **rust.vim** (`rust-lang`) - Rust syntax + rustfmt
- **vim-json** (`elzr`) - JSON syntax
- **vim-yaml** (`stephpy`) - YAML syntax
- **Jenkinsfile-vim-syntax** (`martinda`) - Jenkinsfile support
- **typescript-vim** (`leafgarland`) - TypeScript syntax
- **vim-js** (`yuezk`) + **vim-jsx-pretty** (`maxmellon`) - JSX syntax
- **vim-graphql** (`jparise`) - GraphQL syntax
- **vim-terraform** (`hashivim`) - Terraform syntax + fmt on save
- **vim-hcl** (`jvirtanen`) - HCL syntax
- **vim-packer** (`hashivim`) - Packer syntax
- **vim-caddyfile** (`isobit`) - Caddyfile syntax
- **vim-shfmt** (`z0mbix`) - Shell script formatting on save
- **vim-liquid** (`tpope`) - Liquid template syntax
- **vim-tidal** (`tidalcycles`) - TidalCycles (live coding)
- **scvim** (`supercollider`) - SuperCollider IDE
- **vim-mscgen** (`goodell`) - Mscgen diagram syntax

### Git
- **vim-gitgutter** (`airblade`) - Diff markers in gutter, hunk staging/preview
  - `]c` / `[c` - jump to next/prev changed hunk
  - `<leader>hs` - stage hunk
  - `<leader>hu` - undo hunk
  - `<leader>hp` - preview hunk
- **vim-fugitive** (`tpope`) - Git command integration
  - `<leader>gb` - `git blame` current file
  - `<leader>gd` - `git diff` current file
  - `<leader>gD` - `git diff` (all)

### Editing & Navigation
- **fzf** + **fzf.vim** (`junegunn`) - Fuzzy finding
  - `Ctrl-t` - fuzzy file finder
  - `Ctrl-b` - buffer list
  - `Ctrl-p` - file finder including gitignored files
- **vim-surround** (`tpope`) - Add/remove surrounding characters
- **delimitMate** (`Raimondi`) - Auto-close brackets/quotes
- **vim-indent-guides** (`nathanaelkane`) - Indent level guides
- **nerdcommenter** (`scrooloose`) - Toggle comments
- **emmet-vim** (`mattn`) - Emmet abbreviations for HTML/CSS

### Formatting & Linting
- **neoformat** (`sbdchd`) - Multi-language formatting (runs on save for web files)
- **vim-prettier** (`prettier`) - Prettier integration
- **black** (`psf`) - Python formatter (runs on save)
- **vim-terraform** - `terraform fmt` on save (see above)

### Completion & LSP
- **coc.nvim** (`neoclide`) - LSP client / completion engine
  - Extensions: `coc-tsserver`
  - `Ctrl-space` - trigger completion
  - `gd` - go to definition
  - `gr` - go to references
  - `K` - show docs
  - `[g` / `]g` - navigate diagnostics

### AI
- **copilot.vim** (`github`) - GitHub Copilot inline suggestions
  - `Ctrl-e` - accept suggestion
- **claude.vim** (`pasky`) - Claude chat/implement
  - `<leader>ci` - implement
  - `<leader>cl` - open chat
  - `Ctrl-]` - send chat message
- **aider.vim** (`nekowasabi`) - Aider integration

### Writing
- **markdown-preview.nvim** (`iamcco`) - Live markdown preview in browser
  - `<leader>mp` - toggle preview
- **img-paste.vim** (`img-paste-devs`) - Paste images into markdown
  - `<leader>p` - paste clipboard image (markdown files only)
- **goyo.vim** (`junegunn`) - Distraction-free writing mode
- **vim-pencil** (`reedes`) - Prose editing mode

### Other
- **vim-oscyank** (`ojroques`) - OSC yank for remote/SSH sessions
  - `<leader>y` - yank visual selection via OSC
- **seoul256.vim** (`junegunn`) - Color scheme
- **plenary.nvim** (`nvim-lua`) - Lua utility library
- **telescope.nvim** (`nvim-telescope`) - Fuzzy finder framework

## Misc Mappings
- `<leader>nf` - new file in current directory
- `<leader>mf` - rename current file
- `<leader>o` - open current file in Finder
- `<leader>cp` - copy current file path to clipboard
- `<leader>cf` - copy current file content to clipboard
- `F12` - send vim to background (`Ctrl-z`)
