const res = await fetch(
  "https://ssen-powertrack-api.opcld.com/gridiview/reporter/info/livefaults",
  {
    "cache": "default",
    "credentials": "omit",
    "headers": {
      "Accept": "*/*",
      "Accept-Language": "en-GB,en;q=0.9",
      "Cache-Control": "no-cache",
      "If-Modified-Since": "Mon, 25 Mar 2024 13:24:12 GMT",
      "Pragma": "no-cache",
      "User-Agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2.1 Safari/605.1.15",
    },
    "method": "GET",
    "mode": "cors",
    "redirect": "follow",
    "referrer": "https://powertrack.ssen.co.uk/",
    "referrerPolicy": "strict-origin-when-cross-origin",
  },
).then((res) => res.json());
console.log(JSON.stringify(res, null, 2));
