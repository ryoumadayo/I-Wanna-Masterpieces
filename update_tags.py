"""
Needle と Adventure タグの ID を取得し、games.js に反映させるスクリプト。
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
    print(f"Fetching {tag} tag list...")
    try:
        html = fetch_html(url)
        soup = BeautifulSoup(html, "html.parser")
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
    # 除外タグ (Tool, Engine は全体から完全に消す)
    exclude_tags = ["Tool", "Engine"]
    exclude_ids = set()
    for tag in exclude_tags:
        exclude_ids.update(get_ids_for_tag(tag))
    
    # カテゴリ判定用タグ
    needle_ids = get_ids_for_tag("Needle")
    avoidance_ids = get_ids_for_tag("Avoidance")
    adventure_ids = get_ids_for_tag("Adventure")
    
    print(f"\nStats:")
    print(f"  Complete Exclude IDs (Tool/Engine): {len(exclude_ids)}")
    print(f"  Needle IDs: {len(needle_ids)}")
    print(f"  Avoidance IDs: {len(avoidance_ids)}")
    print(f"  Adventure IDs: {len(adventure_ids)}")

    print("\n=== Processing games.json ===")
    with open("games.json", "r", encoding="utf-8") as f:
        games = json.load(f)
    print(f"Total games: {len(games)}")

    processed_games = []
    for g in games:
        # Tool / Engine が含まれていたら完全にスキップ
        if g["id"] in exclude_ids:
            continue
            
        # タグ情報を取得
        has_needle = g["id"] in needle_ids
        has_avoidance = g["id"] in avoidance_ids
        has_adventure = g["id"] in adventure_ids
        
        # 【判定条件】
        # 針ゲー: Needleあり 且つ Avoidanceなし 且つ Adventureなし
        # 耐久: Avoidanceあり 且つ Needleなし 且つ Adventureなし
        g["is_needle"] = has_needle and not has_avoidance and not has_adventure
        g["is_avoidance"] = has_avoidance and not has_needle and not has_adventure
        
        processed_games.append(g)

    print(f"Games after exclusion: {len(processed_games)}")

    # 保存
    with open("games.json", "w", encoding="utf-8") as f:
        json.dump(processed_games, f, indent=2, ensure_ascii=False)

    top_games = [g for g in processed_games if g["num_ratings"] >= 10]
    js_content = f"const GAMES = {json.dumps(top_games, ensure_ascii=False, indent=2)};\n"
    with open("games.js", "w", encoding="utf-8") as f:
        f.write(js_content)
    
    print(f"Generated games.js with {len(top_games)} games.")
    print("Done!")


if __name__ == "__main__":
    main()
