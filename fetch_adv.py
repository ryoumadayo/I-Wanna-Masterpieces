import urllib.request

url = "https://delicious-fruit.com/ratings/advanced_search.php"
req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
try:
    with urllib.request.urlopen(req) as response:
        with open('adv_search.html', 'wb') as f:
            f.write(response.read())
except Exception as e:
    print(f"Error: {e}")
