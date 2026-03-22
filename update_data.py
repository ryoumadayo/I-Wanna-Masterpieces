import json
import re
import datetime
import time
import requests
import os
from bs4 import BeautifulSoup

BASE_URL = "https://delicious-fruit.com"
USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"

def fetch_html(url, retries=3):
    headers = {"User-Agent": USER_AGENT}
    for i in range(retries):
        try:
            response = requests.get(url, headers=headers, timeout=30)
            response.raise_for_status()
            # 明示的に UTF-8 文コードを指定（Delicious Fruit は meta で utf-8 指定だがレスポンスヘッダが ISO-8859-1 の場合があるため）
            response.encoding = 'utf-8'
            return response.text
        except Exception as e:
            print(f"  Attempt {i+1} failed for {url}: {e}")
            if i < retries - 1:
                time.sleep(5)
            else:
                return None

def get_ids_for_tag(tag):
    """特定の見出しタグに関連付けられた全てのゲームのIDを、ページ送りを含めて取得します。"""
    ids = set()
    page = 0
    while True:
        # キャッシュ回避のためにタイムスタンプを追加
        url = f"{BASE_URL}/ratings/full.php?advanced=1&tags={tag}&n={page*100}&t={int(time.time())}"
        print(f"  {tag} タグのリストを取得中 (ページ {page+1})...")
        html = fetch_html(url)
        if not html:
            break
        
        soup = BeautifulSoup(html, "html.parser")
        table = soup.find('table', class_='tablesorter')
        if not table:
            break
            
        found_in_page = 0
        for a in table.find_all("a", href=True):
            href = a["href"]
            if "game_details.php?id=" in href:
                m = re.search(r'id=(\d+)', href)
                if m:
                    val = int(m.group(1))
                    if val not in ids:
                        ids.add(val)
                        found_in_page += 1
        
        # 1つも新しいIDが見つからない、またはテーブルにデータがない場合は終了
        if found_in_page == 0:
            break
            
        page += 1
        time.sleep(1) # 負荷軽減
        
    return ids

def main():
    print("=== ステップ 1: 全てのゲームデータを取得中 ===")
    # n=0 パラメータを付与して全件（評価数0以上）を取得
    # キャッシュ回避のためにタイムスタンプを追加
    full_url = f"{BASE_URL}/ratings/full.php?advanced=1&n=0&t={int(time.time())}"
    html = fetch_html(full_url)
    if not html:
        print("ゲームリストの取得に失敗しました。中断します。")
        return

    soup = BeautifulSoup(html, "html.parser")
    table = soup.find('table', class_='tablesorter')
    if not table:
        print("HTML内にテーブルが見つかりませんでした。中断します。")
        return

    all_games = []
    rows = table.find('tbody').find_all('tr')
    print(f"全リストから {len(rows)} 行見つかりました。")

    for r in rows:
        cols = r.find_all('td')
        if len(cols) >= 4:
            a_tag = cols[0].find('a')
            if not a_tag:
                continue
            
            game_name = a_tag.text.strip()
            game_id_match = re.search(r'id=(\d+)', a_tag['href'])
            game_id = int(game_id_match.group(1)) if game_id_match else 0
            
            # 最新の値をパース
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
                # 'N/A' 等の場合は 0.0 に
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

    print(f"パース完了: {len(all_games)} 件")

    print("\n=== ステップ 2: フィルタリングとカテゴリ分けのためのタグ収集 ===")
    exclude_tags = ["Tool", "Engine"]
    exclude_ids = set()
    for tag in exclude_tags:
        exclude_ids.update(get_ids_for_tag(tag))

    needle_ids = get_ids_for_tag("Needle")
    avoidance_ids = get_ids_for_tag("Avoidance")
    adventure_ids = get_ids_for_tag("Adventure")

    print(f"\n統計:")
    print(f"  除外対象 ID (Tool/Engine): {len(exclude_ids)}")
    print(f"  針ゲー (Needle) ID数: {len(needle_ids)}")
    print(f"  耐久 (Avoidance) ID数: {len(avoidance_ids)}")
    print(f"  アドベンチャー ID数: {len(adventure_ids)}")

    print("\n=== ステップ 3: ゲームリストのフィルタリングと処理 ===")
    processed_games = []
    for g in all_games:
        # Tool系を除外
        if g["id"] in exclude_ids:
            continue
            
        has_needle = g["id"] in needle_ids
        has_avoidance = g["id"] in avoidance_ids
        has_adventure = g["id"] in adventure_ids
        
        # カテゴリ判定:
        # 針ゲー: Needleタグあり、かつ耐久・アドベンチャーなし
        g["is_needle"] = has_needle and not has_avoidance and not has_adventure
        # 耐久: Avoidanceタグあり、かつ針・アドベンチャーなし
        g["is_avoidance"] = has_avoidance and not has_needle and not has_adventure
        
        processed_games.append(g)

    print(f"除外処理後の件数: {len(processed_games)}")

    # 以前のデータがあれば読み込む
    old_top_ids = set()
    old_top_names = {}
    announcements = []
    try:
        if os.path.exists("games.json"):
            with open("games.json", "r", encoding="utf-8") as f:
                old_data = json.load(f)
                old_games = old_data.get("games", [])
                announcements = old_data.get("announcements", [])
                # 以前の「名作（Top Games）」を特定
                for g in old_games:
                    if g.get("num_ratings", 0) >= 10 and g.get("rating", 0) >= 6.0:
                        old_top_ids.add(g["id"])
                        old_top_names[g["id"]] = g["name"]
    except Exception as e:
        print(f"以前のデータの読み込み中にエラーが発生しました: {e}")

    # 現在の名作（Top Games）を特定
    new_top_games = [g for g in processed_games if g["num_ratings"] >= 10 and g["rating"] >= 6.0]
    new_top_ids = {g["id"] for g in new_top_games}

    # お知らせの生成
    today_str = datetime.datetime.now(datetime.timezone(datetime.timedelta(hours=9))).strftime("%Y/%m/%d")
    
    # 新規追加の検知
    for g in new_top_games:
        if g["id"] not in old_top_ids:
            msg = f"{g['name']} が新たに追加されました。"
            # 重複を避ける（同じ内容のお知らせが直近にある場合は追加しない）
            if not any(a["message"] == msg for a in announcements[:5]):
                announcements.insert(0, {"date": today_str, "message": msg, "type": "add", "id": g["id"]})
                print(f"お知らせ追加 (新規): {msg}")

    # 除外の検知
    for gid in old_top_ids:
        if gid not in new_top_ids:
            # プロセシングされた全ゲームの中にまだ存在するか確認
            still_exists = any(g["id"] == gid for g in processed_games)
            if still_exists:
                msg = f"{old_top_names[gid]}の評価が基準値を下回ったことにより、除外対象となりました。"
            else:
                msg = f"{old_top_names[gid]}が削除されたため、除外対象となりました。"
            
            if not any(a["message"] == msg for a in announcements[:5]):
                announcements.insert(0, {"date": today_str, "message": msg, "type": "remove", "id": gid})
                print(f"お知らせ追加 (除外): {msg}")

    # お知らせは最新30件程度に制限
    announcements = announcements[:30]

    # 全データを保存
    output_data = {
        "last_updated": datetime.datetime.now(datetime.timezone(datetime.timedelta(hours=9))).strftime("%Y-%m-%d %H:%M:%S"),
        "announcements": announcements,
        "games": processed_games
    }
    with open("games.json", "w", encoding="utf-8") as f:
        json.dump(output_data, f, indent=2, ensure_ascii=False)

    # JSファイル用（評価 6.0 以上 かつ 評価数 10 件 以上の名作のみ）
    js_content = f"const GAMES = {json.dumps(new_top_games, ensure_ascii=False, indent=2)};\n"
    with open("games.js", "w", encoding="utf-8") as f:
        f.write(js_content)
    
    print(f"評価 6.0 以上、評価数 10 件 以上のゲームを {len(new_top_games)} 件含む games.js を生成しました。")
    print(f"お知らせを {len(announcements)} 件保存しました。")
    print("更新処理が正常に完了しました！")

if __name__ == "__main__":
    main()
