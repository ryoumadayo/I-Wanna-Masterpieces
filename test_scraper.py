import urllib.request
from bs4 import BeautifulSoup

url2 = "https://delicious-fruit.com/ratings/full.php?q=ALL"
req2 = urllib.request.Request(url2, headers={'User-Agent': 'Mozilla/5.0'})
try:
    with urllib.request.urlopen(req2) as response:
        with open('full_php_all.html', 'wb') as f:
            f.write(response.read())
        print("Success, saved as full_php_all.html")
except Exception as e:
    print(f"Error full: {e}")
