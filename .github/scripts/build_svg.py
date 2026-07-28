"""Generate dark_mode.svg and light_mode.svg for the profile README.

Reads static content from profile_data.json, fetches live GitHub stats
(public repos, total stars), and renders both theme variants of the
terminal-style profile SVG. Run by the update-profile GitHub Action daily;
can also be run locally (falls back gracefully if the API is unreachable).
"""

import json
import os
import sys
import urllib.request
from html import escape
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
DATA_FILE = Path(__file__).with_name("profile_data.json")

THEMES = {
    "dark": {
        "bg": "#1A1B26",
        "titlebar": "#13141D",
        "titlebar_line": "#2A2B3A",
        "title_text": "#6B6D7B",
        "text": "#CBCDD9",
        "hero": "#FFFFFF",
        "subtitle": "#8B8DA0",
        "muted": "#6B6D7B",
        "dots": "#2E3044",
        "accent": "#DA7756",
        "green": "#7EE787",
        "blue": "#7AAFFF",
        "tool_border": "#2E3044",
        "tool_header_bg": "#1E1F2E",
        "tool_label": "#B0B2C3",
        "tool_muted": "#8B8DA0",
        "palette": ["#DA7756", "#7EE787", "#7AAFFF", "#FFA657",
                    "#D2A8FF", "#FF7B72", "#CBCDD9", "#6B6D7B"],
    },
    "light": {
        "bg": "#FFFFFF",
        "titlebar": "#F0F1F3",
        "titlebar_line": "#D1D5DB",
        "title_text": "#9CA3AF",
        "text": "#1F2328",
        "hero": "#1F2328",
        "subtitle": "#656D76",
        "muted": "#9CA3AF",
        "dots": "#D1D5DB",
        "accent": "#DA7756",
        "green": "#1A7F37",
        "blue": "#0969DA",
        "tool_border": "#D1D5DB",
        "tool_header_bg": "#F6F8FA",
        "tool_label": "#1F2328",
        "tool_muted": "#656D76",
        "palette": ["#DA7756", "#1A7F37", "#0969DA", "#D4872E",
                    "#8250DF", "#CF222E", "#1F2328", "#9CA3AF"],
    },
}

SYS_LEADER_WIDTH = 19
PROJECT_LEADER_WIDTH = 18


def fetch_github_stats(user):
    """Return (public_repos, total_stars) or None on any failure."""
    token = os.environ.get("GITHUB_TOKEN", "")
    headers = {"User-Agent": "profile-svg-builder"}
    if token:
        headers["Authorization"] = f"Bearer {token}"

    def get_json(url):
        req = urllib.request.Request(url, headers=headers)
        with urllib.request.urlopen(req, timeout=15) as resp:
            return json.loads(resp.read().decode("utf-8"))

    try:
        profile = get_json(f"https://api.github.com/users/{user}")
        repos = get_json(
            f"https://api.github.com/users/{user}/repos?per_page=100&type=owner"
        )
        stars = sum(r.get("stargazers_count", 0) for r in repos)
        return profile.get("public_repos", len(repos)), stars
    except Exception as exc:  # noqa: BLE001 - any failure means "no live data"
        print(f"WARN: live stats unavailable ({exc})", file=sys.stderr)
        return None


def leaders(label, width):
    dots = "." * max(width - len(label), 3)
    return f" {dots} "


def kv_row(theme, y, label, value, width=SYS_LEADER_WIDTH):
    t = THEMES[theme]
    return (
        f'  <text x="32" y="{y}" font-size="13">\n'
        f'    <tspan fill="{t["accent"]}" font-weight="bold">{escape(label)}</tspan>'
        f'<tspan fill="{t["dots"]}">{leaders(label, width)}</tspan>'
        f'<tspan fill="{t["text"]}">{escape(value)}</tspan>\n'
        f"  </text>\n"
    )


def project_rows(theme, data):
    t = THEMES[theme]
    out = []
    y_name, y_stack = 344, 359
    for proj in data["projects"]:
        parts = [
            f'<tspan fill="{t["accent"]}">{escape(proj["name"])}</tspan>'
            f'<tspan fill="{t["dots"]}">{leaders(proj["name"], PROJECT_LEADER_WIDTH)}</tspan>'
            f'<tspan fill="{t["text"]}">{escape(proj["desc"])}</tspan>'
        ]
        for color_key, badge in proj["badges"]:
            color = t["text"] if color_key == "text" else t[color_key]
            parts.append(
                f'<tspan fill="{t["muted"]}"> | </tspan>'
                f'<tspan fill="{color}">{escape(badge)}</tspan>'
            )
        out.append(
            f'  <text x="48" y="{y_name}" font-size="13">\n'
            f'    {"".join(parts)}\n'
            f"  </text>\n"
            f'  <text x="48" y="{y_stack}" font-size="11">\n'
            f'    <tspan fill="{t["muted"]}">{escape(proj["stack"])}</tspan>\n'
            f"  </text>\n"
        )
        y_name += 33
        y_stack += 33
    return "".join(out)


def contact_rows(theme, data):
    t = THEMES[theme]
    out = []
    y = 540
    for row in data["contact"]:
        for col, (label, value) in enumerate(row):
            x = 32 if col == 0 else 450
            width = 14 if col == 0 else 12
            out.append(
                f'  <text x="{x}" y="{y}" font-size="13">\n'
                f'    <tspan fill="{t["accent"]}">{escape(label)}</tspan>'
                f'<tspan fill="{t["dots"]}">{leaders(label, width)}</tspan>'
                f'<tspan fill="{t["blue"]}">{escape(value)}</tspan>\n'
                f"  </text>\n"
            )
        y += 18
    return "".join(out)


def build_svg(theme, data, live_stats):
    t = THEMES[theme]

    summary = (
        f'<tspan fill="{t["green"]}">{escape(data["summary_static"])}</tspan>'
    )
    if live_stats:
        repos, stars = live_stats
        summary += (
            f'<tspan fill="{t["muted"]}"> &#183; </tspan>'
            f'<tspan fill="{t["text"]}">&#9733; {stars} stars</tspan>'
            f'<tspan fill="{t["muted"]}"> &#183; </tspan>'
            f'<tspan fill="{t["text"]}">{repos} repos</tspan>'
        )

    sys_info = "".join(
        kv_row(theme, 186 + i * 18, label, value)
        for i, (label, value) in enumerate(data["system_info"])
    )

    palette = "".join(
        f'  <rect x="{32 + i * 20}" y="578" width="14" height="14" rx="2" fill="{c}"/>\n'
        for i, c in enumerate(t["palette"])
    )

    contact_rule = "&#9472;" * 77

    return f'''<svg viewBox="0 0 840 600" xmlns="http://www.w3.org/2000/svg">
  <style>
    @keyframes blink {{ 0%,100%{{opacity:1}} 50%{{opacity:0}} }}
    @keyframes pulse {{ 0%,100%{{opacity:1}} 50%{{opacity:.3}} }}
    .cursor {{ animation: blink 1.1s step-end infinite; }}
    .dot-pulse {{ animation: pulse 2s ease-in-out infinite; }}
    text, tspan {{ font-family: 'Consolas','Courier New','Liberation Mono',monospace; }}
  </style>

  <rect width="840" height="600" rx="12" fill="{t["bg"]}"/>

  <rect width="840" height="44" rx="12" fill="{t["titlebar"]}"/>
  <rect y="34" width="840" height="10" fill="{t["titlebar"]}"/>
  <line x1="0" y1="44" x2="840" y2="44" stroke="{t["titlebar_line"]}"/>
  <circle cx="22" cy="22" r="6" fill="#FF5F57"/>
  <circle cx="42" cy="22" r="6" fill="#FEBC2E"/>
  <circle cx="62" cy="22" r="6" fill="#28C840"/>
  <text x="420" y="27" text-anchor="middle" font-size="12" fill="{t["title_text"]}">{escape(data["window_title"])}</text>

  <text x="32" y="72" font-size="13">
    <tspan fill="{t["accent"]}" font-weight="bold">&#10095; </tspan>
    <tspan fill="{t["text"]}">neofetch</tspan>
    <tspan fill="{t["accent"]}" class="cursor">&#9608;</tspan>
  </text>

  <text x="32" y="96" font-size="15" font-weight="bold">
    <tspan fill="{t["hero"]}">{escape(data["username"])}</tspan><tspan fill="{t["muted"]}">@</tspan><tspan fill="{t["blue"]}">github</tspan>
  </text>
  <line x1="32" y1="105" x2="180" y2="105" stroke="{t["accent"]}" stroke-width="1.5" stroke-linecap="round"/>

  <text x="32" y="136" font-size="22" font-weight="bold" fill="{t["hero"]}" letter-spacing="2.5">{escape(data["name"])}</text>
  <rect x="32" y="146" width="56" height="2.5" rx="1" fill="{t["accent"]}"/>
  <text x="32" y="162" font-size="13" fill="{t["subtitle"]}">{escape(data["subtitle"])}</text>

{sys_info}
  <rect x="32" y="300" width="776" height="174" rx="6" stroke="{t["tool_border"]}" fill="none" stroke-width="1"/>
  <rect x="33" y="301" width="774" height="25" rx="5" fill="{t["tool_header_bg"]}"/>
  <line x1="33" y1="326" x2="807" y2="326" stroke="{t["tool_border"]}"/>
  <text x="48" y="318" font-size="12">
    <tspan fill="{t["accent"]}">&#9654; </tspan>
    <tspan fill="{t["tool_label"]}" font-weight="bold">Read</tspan>
    <tspan fill="{t["tool_muted"]}"> projects/</tspan>
  </text>
  <circle cx="795" cy="314" r="3" fill="{t["accent"]}" class="dot-pulse"/>

{project_rows(theme, data)}
  <text x="32" y="494" font-size="12">
    {summary}
  </text>

  <text x="32" y="518" font-size="12">
    <tspan fill="{t["muted"]}">&#9472; </tspan><tspan fill="{t["accent"]}" font-weight="bold">Contact</tspan><tspan fill="{t["muted"]}"> {contact_rule}</tspan>
  </text>
{contact_rows(theme, data)}
{palette}</svg>
'''


def main():
    with open(DATA_FILE, encoding="utf-8") as f:
        data = json.load(f)

    live_stats = fetch_github_stats(data["github_user"])
    if live_stats:
        print(f"Live stats: {live_stats[1]} stars, {live_stats[0]} repos")
    else:
        print("Building without live stats")

    for theme in ("dark", "light"):
        out_path = ROOT / "assets" / f"{theme}_mode.svg"
        out_path.write_text(build_svg(theme, data, live_stats), encoding="utf-8")
        print(f"WROTE -> {out_path.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
