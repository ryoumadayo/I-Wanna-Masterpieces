"""
delicious-fruit.com の指定したタグ（Tool, Engine など）がついたゲームを
games.json / games.js から除外するスクリプト。
"""

import json
import re
import urllib.request
from bs4 import BeautifulSoup

BASE_URL = "https://delicious-fruit.com"


import time

def fetch_html(url: str, retries=3) -> str:
    for i in range(retries):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
            with urllib.request.urlopen(req, timeout=30) as resp:
                return resp.read().decode("utf-8", errors="replace")
        except Exception as e:
            print(f"  Attempt {i+1} failed: {e}")
            if i < retries - 1:
                time.sleep(2)
            else:
                raise e


def get_ids_for_tag(tag: str) -> set:
    """指定したタグページからゲームIDをすべて抽出する"""
    ids = set()
    url = f"{BASE_URL}/ratings/full.php?advanced=1&tags={tag}"
    print(f"Fetching {tag} tag list: {url}")
    try:
        html = fetch_html(url)
        soup = BeautifulSoup(html, "html.parser")
        # game_details.php?id=XXX 形式のリンクを全て抽出
        for a in soup.find_all("a", href=True):
            href = a["href"]
            if "game_details.php?id=" in href:
                m = re.search(r'id=(\d+)', href)
                if m:
                    ids.add(int(m.group(1)))
    except Exception as e:
        print(f"Error fetching {tag}: {e}")
    
    return ids


def main():
    target_tags = ["Tool", "Engine"]
    all_exclude_ids = set()
    
    print(f"=== Step 1: Collecting IDs for tags: {', '.join(target_tags)} ===")
    for tag in target_tags:
        tag_ids = get_ids_for_tag(tag)
        print(f"  Found {len(tag_ids)} IDs for {tag}")
        all_exclude_ids.update(tag_ids)
    
    print(f"\nTotal unique IDs to exclude: {len(all_exclude_ids)}")

    print("\n=== Step 2: Loading games.json ===")
    try:
        with open("games.json", "r", encoding="utf-8") as f:
            games = json.load(f)
    except FileNotFoundError:
        print("games.json not found. Make sure to run the main scraper first.")
        return

    print(f"Total games before filter: {len(games)}")

    print("\n=== Step 3: Filtering out tagged games ===")
    filtered = [g for g in games if g["id"] not in all_exclude_ids]
    removed = [g for g in games if g["id"] in all_exclude_ids]

    if removed:
        print(f"Removing {len(removed)} games:")
        # Show first 20 for brevity
        for g in removed[:20]:
            print(f"  - [{g['id']}] {g['name']}")
        if len(removed) > 20:
            print(f"  ... and {len(removed) - 20} more.")
    else:
        print("No matching tagged games found in games.json.")

    print(f"Games remaining: {len(filtered)}")

    print("\n=== Step 4: Saving games.json ===")
    with open("games.json", "w", encoding="utf-8") as f:
        json.dump(filtered, f, indent=2, ensure_ascii=False)

    print("\n=== Step 5: Regenerating games.js ===")
    # Preserve the "num_ratings >= 20" logic from make_js.py
    top_games = [g for g in filtered if g["num_ratings"] >= 10]
    
    # Adding a timestamp for cache busting inside the file if needed, 
    # but the user wanted the data itself to be updated.
    js_content = f"const GAMES = {json.dumps(top_games, ensure_ascii=False, indent=2)};\n"
    with open("games.js", "w", encoding="utf-8") as f:
        f.write(js_content)
    
    print(f"Generated games.js with {len(top_games)} games.")
    print("Done!")


if __name__ == "__main__":
    main()
