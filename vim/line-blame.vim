if !exists('*popup_atcursor')
    finish
endif

function! LineBlamePopup() abort
    let l:file = expand('%:p')
    if empty(l:file) || &buftype !=# ''
        echo 'Open a Git-tracked file first.'
        return
    endif
    let l:git = 'git -C ' . shellescape(fnamemodify(l:file, ':h'))
    let l:contents = join(getline(1, '$'), "\n") . (&endofline ? "\n" : '')
    let l:blame = systemlist(l:git . ' blame --line-porcelain --contents - -L ' . line('.') . ',' . line('.') . ' -- ' . shellescape(fnamemodify(l:file, ':t')), l:contents)
    if v:shell_error
        echo 'Line blame unavailable: ' . get(l:blame, 0, 'Git could not read this file.')
        return
    endif
    let l:commit = matchstr(get(l:blame, 0, ''), '^\x\{40,64\}\ze ')
    if empty(l:commit)
        echo 'Git returned no commit for this line.'
        return
    endif
    if l:commit =~# '^0\+$'
        let l:info = ['Uncommitted change', '', 'This line differs from the last commit.']
    else
        let l:info = systemlist(l:git . ' show --no-patch --no-color --date=iso-strict --format=' . shellescape('%h  %an%n%ad%n%n%B') . ' ' . shellescape(l:commit))
        if v:shell_error
            echo 'Could not read commit details.'
            return
        endif
    endif
    if exists('s:line_blame_popup')
        call popup_close(s:line_blame_popup)
    endif
    let s:line_blame_popup = popup_atcursor(l:info, {
        \ 'padding': [0, 1, 0, 1],
        \ 'border': [],
        \ 'maxwidth': 90,
        \ 'maxheight': 20,
        \ 'moved': 'any',
        \ 'mapping': 0,
        \ 'filter': 'LineBlamePopupFilter',
        \ })
endfunction

function! LineBlamePopupFilter(id, key) abort
    if index(["\<Esc>", "\<CR>", 'q'], a:key) >= 0
        call popup_close(a:id)
        return 1
    endif
    return 0
endfunction

command! LineBlame call LineBlamePopup()
nnoremap <silent> <leader>gp :LineBlame<CR>
