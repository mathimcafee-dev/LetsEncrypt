#!/usr/bin/env python3
"""SSLVault deep scanner — runs on a free GitHub Actions runner.
Polls Supabase for pending deep_scans, runs testssl.sh, writes findings back."""
import json, os, subprocess, sys, urllib.request, datetime

SB_URL = os.environ["SB_URL"].rstrip("/")
KEY    = os.environ["SB_SERVICE_KEY"]
H = {"apikey": KEY, "Authorization": f"Bearer {KEY}", "Content-Type": "application/json"}

def req(method, path, body=None):
    data = json.dumps(body).encode() if body is not None else None
    r = urllib.request.Request(SB_URL + path, data=data, headers={**H, "Prefer": "return=representation"}, method=method)
    with urllib.request.urlopen(r, timeout=30) as resp:
        txt = resp.read().decode()
        return json.loads(txt) if txt else None

def now():
    return datetime.datetime.now(datetime.timezone.utc).isoformat()

PROTO_IDS = {"SSLv2": "SSL 2.0", "SSLv3": "SSL 3.0", "TLS1": "TLS 1.0",
             "TLS1_1": "TLS 1.1", "TLS1_2": "TLS 1.2", "TLS1_3": "TLS 1.3"}
VULN_IDS = {"heartbleed": "Heartbleed", "CCS": "CCS Injection", "ticketbleed": "Ticketbleed",
            "ROBOT": "ROBOT", "CRIME_TLS": "CRIME", "BREACH": "BREACH", "POODLE_SSL": "POODLE (SSL)",
            "fallback_SCSV": "TLS_FALLBACK_SCSV", "SWEET32": "SWEET32", "FREAK": "FREAK",
            "DROWN": "DROWN", "LOGJAM": "LOGJAM", "BEAST": "BEAST", "LUCKY13": "LUCKY13",
            "winshock": "Winshock", "RC4": "RC4 ciphers"}
SEV_RANK = {"CRITICAL": 4, "HIGH": 3, "MEDIUM": 2, "LOW": 1}

def parse(path):
    with open(path) as f:
        items = json.load(f)
    protocols, vulns, findings = [], [], []
    grade = None
    counts = {"CRITICAL": 0, "HIGH": 0, "MEDIUM": 0, "LOW": 0}
    for it in items:
        iid = it.get("id", "")
        sev = (it.get("severity") or "").upper()
        fin = it.get("finding", "")
        if iid in PROTO_IDS:
            offered = "not offered" not in fin.lower() and "offered" in fin.lower()
            insecure = iid in ("SSLv2", "SSLv3", "TLS1", "TLS1_1")
            protocols.append({"name": PROTO_IDS[iid], "offered": offered,
                              "ok": (not offered) if insecure else True})
        if iid in VULN_IDS:
            vulnerable = sev not in ("OK", "INFO", "")
            vulns.append({"name": VULN_IDS[iid], "vulnerable": vulnerable, "note": fin,
                          "cve": it.get("cve", "")})
        if iid == "overall_grade":
            grade = fin
        if sev in SEV_RANK:
            counts[sev] += 1
            findings.append({"id": iid, "severity": sev, "finding": fin, "cve": it.get("cve", "")})
    findings.sort(key=lambda x: SEV_RANK.get(x["severity"], 0), reverse=True)
    return {"protocols": protocols, "vulns": vulns, "findings": findings[:60],
            "counts": counts, "total_findings": len(findings)}, grade

def run_one(scan):
    sid, domain = scan["id"], scan["domain"]
    print(f"::group::Deep scan {domain}")
    req("PATCH", f"/rest/v1/deep_scans?id=eq.{sid}", {"status": "running", "started_at": now()})
    out = f"/tmp/{sid}.json"
    try:
        subprocess.run(
            ["./testssl.sh/testssl.sh", "--jsonfile", out, "--severity", "LOW",
             "--quiet", "--color", "0", "--warnings", "batch", "--openssl-timeout", "30",
             "--connect-timeout", "30", domain],
            timeout=280, check=False, capture_output=True)
        summary, grade = parse(out)
        req("PATCH", f"/rest/v1/deep_scans?id=eq.{sid}",
            {"status": "done", "grade": grade, "summary": summary, "finished_at": now()})
        req("PATCH", f"/rest/v1/monitored_domains?id=eq.{scan['domain_id']}",
            {"deep_grade": grade, "deep_scan_at": now()})
        print(f"done: {domain} grade={grade} findings={summary['total_findings']}")
    except Exception as e:
        req("PATCH", f"/rest/v1/deep_scans?id=eq.{sid}",
            {"status": "error", "error": str(e)[:400], "finished_at": now()})
        print(f"error: {domain}: {e}")
    print("::endgroup::")

def main():
    pending = req("GET", "/rest/v1/deep_scans?status=eq.pending&select=*&order=requested_at.asc&limit=5") or []
    print(f"{len(pending)} pending deep scan(s)")
    for scan in pending:
        run_one(scan)

if __name__ == "__main__":
    main()
