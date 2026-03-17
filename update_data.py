import json
import re
import time
import requests
from bs4 import BeautifulSoup

BASE_URL = "https://delicious-fruit.com"
USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"

def fetch_html(url, retries=3):
    headers = {"User-Agent": USER_AGENT}
    for i in range(retries):
        try:
            response = requests.get(url, headers=headers, timeout=30)
            response.raise_for_status()
            return response.text
        except Exception as e:
            print(f"  Attempt {i+1} failed for {url}: {e}")
            if i < retries - 1:
                time.sleep(5)
            else:
                return None

def get_ids_for_tag(tag):
    """Fetch IDs of games associated with a specific tag."""
    ids = set()
    url = f"{BASE_URL}/ratings/full.php?advanced=1&tags={tag}"
    print(f"Fetching {tag} tag list...")
    html = fetch_html(url)
    if not html:
        return ids
    
    soup = BeautifulSoup(html, "html.parser")
    for a in soup.find_all("a", href=True):
        href = a["href"]
        if "game_details.php?id=" in href:
            m = re.search(r'id=(\d+)', href)
            if m:
                ids.add(int(m.group(1)))
    return ids

def main():
    print("=== Step 1: Fetching all games data ===")
    full_url = f"{BASE_URL}/ratings/full.php?advanced=1"
    html = fetch_html(full_url)
    if not html:
        print("Failed to fetch full games list. Aborting.")
        return

    soup = BeautifulSoup(html, "html.parser")
    table = soup.find('table', class_='tablesorter')
    if not table:
        print("Table not found in HTML. Aborting.")
        return

    all_games = []
    rows = table.find('tbody').find_all('tr')
    print(f"Found {len(rows)} rows in full list.")

    for r in rows:
        cols = r.find_all('td')
        if len(cols) >= 4:
            a_tag = cols[0].find('a')
            if not a_tag:
                continue
            
            game_name = a_tag.text.strip()
            game_id_match = re.search(r'id=(\d+)', a_tag['href'])
            game_id = int(game_id_match.group(1)) if game_id_match else 0
            
            diff_text = cols[1].text.strip()
            rating_text = cols[2].text.strip()
            num_ratings_text = cols[3].text.strip()
            
            try:
                rating = float(rating_text)
            except ValueError:
                rating = 0.0
                
            try:
                num_ratings = int(num_ratings_text)
            except ValueError:
                num_ratings = 0
                
            try:
                difficulty_num = float(diff_text)
            except ValueError:
                difficulty_num = 0.0

            all_games.append({
                'id': game_id,
                'name': game_name,
                'difficulty': diff_text,
                'difficulty_num': difficulty_num,
                'rating': rating,
                'num_ratings': num_ratings
            })

    print(f"Total games parsed: {len(all_games)}")

    print("\n=== Step 2: Collecting Tags for Filtering and Categorization ===")
    exclude_tags = ["Tool", "Engine"]
    exclude_ids = set()
    for tag in exclude_tags:
        exclude_ids.update(get_ids_for_tag(tag))

    needle_ids = get_ids_for_tag("Needle")
    avoidance_ids = get_ids_for_tag("Avoidance")
    adventure_ids = get_ids_for_tag("Adventure")

    print(f"\nStats:")
    print(f"  Excluded IDs (Tool/Engine): {len(exclude_ids)}")
    print(f"  Needle IDs: {len(needle_ids)}")
    print(f"  Avoidance IDs: {len(avoidance_ids)}")
    print(f"  Adventure IDs: {len(adventure_ids)}")

    print("\n=== Step 3: Filtering and Processing Game List ===")
    processed_games = []
    for g in all_games:
        # Exclude Tool/Engine
        if g["id"] in exclude_ids:
            continue
            
        has_needle = g["id"] in needle_ids
        has_avoidance = g["id"] in avoidance_ids
        has_adventure = g["id"] in adventure_ids
        
        # Categories:
        # Needle: Has Needle AND NOT Avoidance AND NOT Adventure
        # Avoidance: Has Avoidance AND NOT Needle AND NOT Adventure
        g["is_needle"] = has_needle and not has_avoidance and not has_adventure
        g["is_avoidance"] = has_avoidance and not has_needle and not has_adventure
        
        processed_games.append(g)

    print(f"Games after exclusion: {len(processed_games)}")

    # Sort by rating and comments (preserving original logic)
    # The filter_games.py sorted by rating >= 6.0 then num_ratings
    # But current site seems to show everything and has its own sorting.
    # We'll save the full list to games.json and the filtered list (>=10 ratings) to games.js
    
    with open("games.json", "w", encoding="utf-8") as f:
        json.dump(processed_games, f, indent=2, ensure_ascii=False)

    # Filtering for the JS file (only games with 10+ ratings)
    top_games = [g for g in processed_games if g["num_ratings"] >= 10]
    
    js_content = f"const GAMES = {json.dumps(top_games, ensure_ascii=False, indent=2)};\n"
    with open("games.js", "w", encoding="utf-8") as f:
        f.write(js_content)
    
    print(f"Generated games.js with {len(top_games)} games.")
    print("Automatic update process completed successfully!")

if __name__ == "__main__":
    main()
