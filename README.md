# Hacker OS

A desktop environment in the browser. Window manager, dock, launcher, boot
sequence and a set of apps, all in vanilla HTML, CSS and JavaScript.

## Run

Serve the folder with any static server, for example:

```bash
python3 -m http.server 8099
```

Then open `http://localhost:8099`.

Opening `index.html` directly from disk also works, except the terminal
banner falls back to a baked-in copy of the logo instead of loading
`assets/fetch.txt`.

## Features

- Boot sequence with a progress line
- Window manager with drag, resize, minimize, maximize and focus
- Left dock rail with running indicators
- Searchable app launcher
- Top status bar with clock, link, cpu and memory readouts
- Session uptime that resets on reload
- Terminal with a fastfetch style banner (logo from `assets/fetch.txt`)
- Shell commands: `help`, `ls`, `cat`, `pwd`, `whoami`, `uname`, `date`,
  `uptime`, `fetch`, `apps`, `open`, `clear`, `echo`, `exit`
- Apps: Terminal, Files, Editor, Network, Settings, System

## Layout

```
index.html          entry point
styles/             css split by role (theme, layout, windows, apps, ...)
scripts/            js modules (window manager, terminal, boot, ...)
assets/wallpaper/   desktop background
assets/fetch.txt    ascii logo used by terminal and system app
```

## Theme

Cool periwinkle on near-black, with a teal dot for live states and rose for
destructive actions. The palette sits in `styles/theme.css`.

## License

MIT
