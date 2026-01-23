A GET request to https://meteofrance.re/fr/cyclone
returns a http response with header
set-cookie: mfsession=rlWwoTSmplV6VzyhqTIlozI0VvjvLJkaVwbvFSZlAGLvYPW0rKNvBvWXI1DvsD.rlWdqTxvBvVmZTIzAQyzBQSvBTL3ZmpkBJLkLJMvAmL2AQIuZmAxAFVfVzyuqPV6ZGp2BQH4ZGtlAK0.Oe2i1GpacFlIxc1Q_F1N8S3xxhbB3-cxbeH-18tCA5N; Path=/; Max-Age=3600; SameSite=None; Secure

The value of mfsession is decoded with
                this.token = o.replace(/[a-zA-Z]/g, function(e) {
                    var t = e <= "Z" ? 65 : 97;
                    return String.fromCharCode(t + (e.charCodeAt(0) - t + 13) % 26)
                })

This token must be passed as:
curl 'https://rpcache-aa.meteofrance.com/internet2018client/2.0/cyclone/list?basin=SWI&season=20252026&current=current' \
  -H 'Accept: */*' \
  -H 'Accept-Language: en-US,en;q=0.9,fr-FR;q=0.8,fr;q=0.7' \
  -H 'Authorization: Bearer eyJjbGFzcyI6ImludGVybmV0IiwiYWxnIjoiSFMyNTYiLCJ0eXAiOiJKV1QifQ.eyJqdGkiOiIzMGVmNDlmODFiOGY3MzcxOWYxYWZiNzY2NDVhMzNkNSIsImlhdCI6MTc2ODU4MTgyNX0.Br2v1TcnpSyVkp1D_S1A8F3kkuoO3-pkorU-18gPN5A' \
  -H 'Connection: keep-alive' \
  -H 'DNT: 1' \
  -H 'Origin: https://meteofrance.re' \
  -H 'Referer: https://meteofrance.re/' \
  -H 'Sec-Fetch-Dest: empty' \
  -H 'Sec-Fetch-Mode: cors' \
  -H 'Sec-Fetch-Site: cross-site' \
  -H 'User-Agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36' \
  -H 'sec-ch-ua: "Google Chrome";v="143", "Chromium";v="143", "Not A(Brand";v="24"' \
  -H 'sec-ch-ua-mobile: ?0' \
  -H 'sec-ch-ua-platform: "macOS"'

This returns
{
    "basin": "SWI",
    "season": "20252026",
    "cyclone_list": {
        "SWI$06/20252026": {
            "cyclone_name": "DUDZAI",
            "cyclone_id": "SWI$06/20252026",
            "current": true,
            "reference_time": "2026-01-16T12:00:00Z"
        }
    }
}

And to fetch details for a specific cyclone, call with same headers:
https://rpcache-aa.meteofrance.com/internet2018client/2.0/cyclone/trajectory?cyclone_id=SWI%2406%2F20252026
It creates trajectory.json file

