" Ask the agent in the tmux pane to the right about the code in front of you.
" Visual <leader>a asks about the selection, <leader>A about the cursor line
" (or follows up on the thread there). The question goes out through
" bin/agent-send; answers the agent pipes to `vim-reply <id>` show up as a one-line
" marker below the lines asked about.
"   <leader>v / :AgentShow  open the answer on the cursor line in a markdown split (q closes)
"   :AgentToggle  hide/show answers
"   :AgentClear   drop the threads in this buffer

if exists('g:loaded_agent') || !has('textprop')
  finish
endif
let g:loaded_agent = 1

let g:agent_send_cmd = get(g:, 'agent_send_cmd', 'agent-send')
let g:agent_reply_lines = get(g:, 'agent_reply_lines', 12)

let s:dir = (empty($XDG_CACHE_HOME) ? expand('~/.cache') : $XDG_CACHE_HOME) . '/vim-agent'
let s:asks = {}
let s:hidden = 0
let s:timer = -1
let s:seed = srand()

hi def link AgentReply Comment

function! s:ReplyFile(id) abort
  return s:dir . '/replies/' . a:id . '.md'
endfunction

" Everything about the asked-about lines is captured before the prompt opens.
function! AgentContext(line1, line2, mode) abort
  if a:mode ==# 'v' || a:mode ==# "\<C-v>"
    let text = getregion(getpos("'<"), getpos("'>"), {'type': a:mode})
  else
    let text = getline(a:line1, a:line2)
  endif
  let ctx = {'bufnr': bufnr(), 'file': expand('%:p'), 'filetype': &filetype,
        \ 'line1': a:line1, 'line2': a:line2, 'text': text, 'parent': '', 'diagnostics': []}
  " Asking again on a line with an answer continues that thread.
  for [id, ask] in items(s:asks)
    let lnum = ask.bufnr == ctx.bufnr ? s:AnchorLine(id) : 0
    if lnum >= a:line1 && lnum <= a:line2 && (empty(ctx.parent) || ask.seq > s:asks[ctx.parent].seq)
      let ctx.parent = id
    endif
  endfor
  if exists('*CocAction') && get(g:, 'coc_service_initialized', 0)
    try
      let ctx.diagnostics = filter(CocAction('diagnosticList'),
            \ {_, d -> d.file ==# ctx.file && d.lnum >= a:line1 && d.lnum <= a:line2})
    catch
    endtry
  endif
  return ctx
endfunction

function! s:Message(id, ctx, question) abort
  let c = a:ctx
  let range = c.line1 == c.line2 ? c.line1 : c.line1 . '-' . c.line2
  let lines = [printf('[vim #%s] %s:%s', a:id, empty(c.file) ? '[No Name]' : c.file, range)]
  if !empty(c.parent)
    call add(lines, printf('Follow-up to #%s.', c.parent))
  endif
  call extend(lines, ['', a:question, '', '```' . c.filetype] + c.text + ['```'])
  if !empty(c.diagnostics)
    call add(lines, '')
    call add(lines, 'Diagnostics:')
    for d in c.diagnostics
      call add(lines, printf('- line %d %s: %s', d.lnum, tolower(d.severity), d.message))
    endfor
  endif
  call add(lines, '')
  call add(lines, printf('When done, also pipe a concise markdown answer (at most %d lines) to `vim-reply %s` so it shows inline in my editor.',
        \ g:agent_reply_lines, a:id))
  return join(lines, "\n")
endfunction

function! AgentAsk(ctx, question) abort
  let id = printf('%06x', rand(s:seed) % 0x1000000)
  let cmd = g:agent_send_cmd . (empty($TMUX_PANE) ? '' : ' --from ' . shellescape($TMUX_PANE))
  let out = system(cmd, s:Message(id, a:ctx, a:question))
  if v:shell_error
    echohl ErrorMsg | echomsg trim(out) | echohl None
    return ''
  endif
  call prop_type_add('agent_anchor_' . id, {})
  call prop_type_add('agent_text_' . id, {'highlight': 'AgentReply'})
  let s:asks[id] = extend(copy(a:ctx), {'question': a:question, 'state': 'pending', 'seq': len(s:asks)})
  call remove(s:asks[id], 'text')
  call s:AnchorLine(id)
  call s:Render(id)
  if s:timer == -1
    let s:timer = timer_start(1000, {-> AgentPoll()}, {'repeat': -1})
  endif
  return id
endfunction

" Returns the line the thread is attached to, re-anchoring if the buffer was reloaded.
function! s:AnchorLine(id) abort
  let ask = s:asks[a:id]
  if !bufloaded(ask.bufnr)
    return 0
  endif
  let found = prop_find({'type': 'agent_anchor_' . a:id, 'bufnr': ask.bufnr, 'lnum': 1, 'col': 1}, 'f')
  if !empty(found)
    return found.lnum
  endif
  let lnum = min([ask.line2, getbufinfo(ask.bufnr)[0].linecount])
  call prop_add(lnum, 1, {'type': 'agent_anchor_' . a:id, 'length': 0, 'bufnr': ask.bufnr})
  return lnum
endfunction

function! s:Render(id) abort
  let ask = s:asks[a:id]
  let lnum = s:AnchorLine(a:id)
  if !lnum
    return
  endif
  call prop_remove({'type': 'agent_text_' . a:id, 'bufnr': ask.bufnr, 'all': 1})
  if s:hidden
    return
  endif
  " Callbacks can run with another buffer current, so measure the indent directly.
  let indent = repeat(' ', strdisplaywidth(matchstr(getbufline(ask.bufnr, lnum)[0], '^\s*')))
  " Keep it to one line; the answer itself opens in a split (s:Show).
  if ask.state ==# 'pending'
    let text = printf('%s⋯ #%s %s', indent, a:id, ask.question)
  else
    let leader = get(g:, 'mapleader', '\')
    let text = printf('%s╰ #%s %s · answered, %sv to open', indent, a:id, ask.question, leader)
  endif
  call prop_add(lnum, 0, {'type': 'agent_text_' . a:id, 'text': text, 'text_align': 'below',
        \ 'text_wrap': 'truncate', 'bufnr': ask.bufnr})
endfunction

function! AgentPoll() abort
  let pending = 0
  for [id, ask] in items(s:asks)
    if ask.state ==# 'pending'
      if filereadable(s:ReplyFile(id))
        let ask.state = 'answered'
        call s:Render(id)
      else
        let pending = 1
      endif
    endif
  endfor
  if !pending && s:timer != -1
    call timer_stop(s:timer)
    let s:timer = -1
  endif
endfunction

function! s:ThreadAtCursor() abort
  let best = ''
  for [id, ask] in items(s:asks)
    if ask.bufnr == bufnr() && ask.state ==# 'answered' && s:AnchorLine(id) == line('.')
          \ && (empty(best) || ask.seq > s:asks[best].seq)
      let best = id
    endif
  endfor
  return best
endfunction

function! s:Show() abort
  let id = s:ThreadAtCursor()
  if empty(id)
    echomsg 'No agent answer on this line'
    return
  endif
  let file = s:ReplyFile(id)
  " Reuse the answer window if one is open.
  let winid = get(filter(gettabinfo(tabpagenr())[0].windows,
        \ {_, w -> getwinvar(w, 'agent_answer', 0)}), 0, 0)
  let height = min([max([len(readfile(file)) + 1, 5]), &lines / 3])
  if winid
    call win_gotoid(winid)
    execute 'edit' fnameescape(file)
    execute 'resize' height
  else
    execute 'botright' height 'split' fnameescape(file)
    let w:agent_answer = 1
  endif
  setlocal filetype=markdown nomodifiable readonly bufhidden=wipe noswapfile
  setlocal wrap linebreak breakindent nonumber norelativenumber nolist signcolumn=no
  nnoremap <buffer> <silent> q :close<CR>
endfunction

function! s:Toggle() abort
  let s:hidden = !s:hidden
  for id in keys(s:asks)
    call s:Render(id)
  endfor
endfunction

function! s:Clear() abort
  for [id, ask] in items(s:asks)
    if ask.bufnr == bufnr()
      call prop_remove({'type': 'agent_text_' . id, 'bufnr': ask.bufnr, 'all': 1})
      call prop_remove({'type': 'agent_anchor_' . id, 'bufnr': ask.bufnr, 'all': 1})
      call remove(s:asks, id)
    endif
  endfor
endfunction

" Text properties do not survive :edit, so put threads back on the reloaded buffer.
function! s:Restore() abort
  let file = expand('<afile>:p')
  for [id, ask] in items(s:asks)
    if ask.file ==# file
      let ask.bufnr = str2nr(expand('<abuf>'))
      call s:Render(id)
    endif
  endfor
endfunction

" A one-line terminal popup next to the lines being asked about.
function! s:Prompt(line1, line2, mode) abort
  if empty($TMUX) && g:agent_send_cmd ==# 'agent-send'
    echohl ErrorMsg | echomsg 'agent: not inside tmux' | echohl None
    return
  endif
  let ctx = AgentContext(a:line1, a:line2, a:mode)
  call mkdir(s:dir, 'p')
  let inputrc = s:dir . '/inputrc'
  if !filereadable(inputrc)
    call writefile(['set horizontal-scroll-mode on'], inputrc)
  endif
  let answer = tempname()
  let script = 'IFS= read -e -r -p "> " q && [ -n "$q" ] && printf "%s" "$q" > "$1"'
  let width = min([80, winwidth(0) - 4])
  let buf = term_start(['bash', '--norc', '--noprofile', '-c', script, 'agent', answer], {
        \ 'hidden': 1, 'term_finish': 'close', 'term_rows': 1, 'term_cols': width,
        \ 'env': {'INPUTRC': inputrc},
        \ 'exit_cb': {_, status -> s:Answered(ctx, answer, status)}})
  " Below the selection when it fits, otherwise above it.
  let below = screenpos(win_getid(), a:line2, 1).row
  let above = screenpos(win_getid(), a:line1, 1).row
  let col = screenpos(win_getid(), a:line1, indent(a:line1) + 1).col
  let opts = {'minwidth': width, 'maxwidth': width, 'minheight': 1, 'maxheight': 1,
        \ 'border': [], 'borderchars': ['─', '│', '─', '│', '╭', '╮', '╯', '╰'],
        \ 'title': ' Ask agent · Enter send · Esc cancel ', 'col': col > 0 ? col : 'cursor'}
  if below > 0 && below + 3 < &lines - &cmdheight
    call extend(opts, {'line': below + 1, 'pos': 'topleft'})
  elseif above > 1
    call extend(opts, {'line': above - 1, 'pos': 'botleft'})
  else
    call extend(opts, {'line': 'cursor+1', 'pos': 'topleft'})
  endif
  let winid = popup_create(buf, opts)
  " Arrow keys arrive as keycodes, so a bare Esc can safely mean cancel. Without
  " 'ttimeout' Vim holds Esc for 'timeoutlen' first, so shorten that meanwhile.
  call win_execute(winid, 'tnoremap <buffer> <Esc> <C-c>')
  let s:saved_timeout = [&ttimeout, &ttimeoutlen]
  set ttimeout ttimeoutlen=50
endfunction

function! s:Answered(ctx, answer, status) abort
  let [&ttimeout, &ttimeoutlen] = s:saved_timeout
  if a:status == 0 && filereadable(a:answer)
    let question = join(readfile(a:answer), ' ')
    call delete(a:answer)
    if !empty(AgentAsk(a:ctx, question))
      echo 'Asked agent'
    endif
  endif
endfunction

xnoremap <silent> <leader>a :<C-u>call <SID>Prompt(line("'<"), line("'>"), visualmode())<CR>
nnoremap <silent> <leader>A :call <SID>Prompt(line('.'), line('.'), '')<CR>
nnoremap <silent> <leader>v :AgentShow<CR>
command! AgentShow call s:Show()
command! AgentToggle call s:Toggle()
command! AgentClear call s:Clear()

augroup agent
  autocmd!
  autocmd BufReadPost * call s:Restore()
  autocmd ColorScheme * hi def link AgentReply Comment
augroup END
