import { exec } from "node:child_process";

const curlCmd = `curl 'https://shop.tiktok.com/api/shop/pdp_h5/get_product_reviews' \
-H 'accept: application/json,*/*;q=0.8' \
-H 'accept-language: zh-CN,zh;q=0.9' \
-H 'content-type: application/json' \
-b 'passport_csrf_token=b258f8cbff778e723b00ecc45f6d1866; passport_csrf_token_default=b258f8cbff778e723b00ecc45f6d1866; tt_chain_token=9YEbY2SRN2gd7J68R5kHxg==; d_ticket=e34024158624152cdf1690517325c640b800e; multi_sids=7564989956658480144%3Acd562a2c279fcaa498faa0215ec01d1f; cmpl_token=AgQQAPNUF-RO0rjC0O9QNB0p8p2nojRKv5bfYNxo9g; passport_auth_status=70e447b6827c6c72986cca78662cf6d1%2C; passport_auth_status_ss=70e447b6827c6c72986cca78662cf6d1%2C; sid_guard=cd562a2c279fcaa498faa0215ec01d1f%7C1761362089%7C15552000%7CThu%2C+23-Apr-2026+03%3A14%3A49+GMT; uid_tt=4af40fbfac34be823103438b3d8f110243ccfe32ca84495c3c072fb4d370fe5a; uid_tt_ss=4af40fbfac34be823103438b3d8f110243ccfe32ca84495c3c072fb4d370fe5a; sid_tt=cd562a2c279fcaa498faa0215ec01d1f; sessionid=cd562a2c279fcaa498faa0215ec01d1f; sessionid_ss=cd562a2c279fcaa498faa0215ec01d1f; tt_session_tlb_tag=sttt%7C4%7CzVYqLCefyqSY-qAhXsAdH_________-8IrOhhhR8sjq4k2ebXm-ayWELZxbyvSACxB9Y4PUOFyY%3D; sid_ucp_v1=1.0.0-KDI5NmU0ZTczOGI3MTk2M2FkOWI1YmE4NjIxYThmZGMxNmZkNWU5ZDMKIgiQiJvAjcmP_mgQqYHxxwYYswsgDDCX_fDHBjgCQOwHSAQQAxoDc2cxIiBjZDU2MmEyYzI3OWZjYWE0OThmYWEwMjE1ZWMwMWQxZg; ssid_ucp_v1=1.0.0-KDI5NmU0ZTczOGI3MTk2M2FkOWI1YmE4NjIxYThmZGMxNmZkNWU5ZDMKIgiQiJvAjcmP_mgQqYHxxwYYswsgDDCX_fDHBjgCQOwHSAQQAxoDc2cxIiBjZDU2MmEyYzI3OWZjYWE0OThmYWEwMjE1ZWMwMWQxZg; store-idc=alisg; store-country-code=ae; store-country-code-src=uid; tt-target-idc=alisg; tt-target-idc-sign=SHhrhIUAwzgZGea3KyEtDb727Q6kzZPy4HDAneZMua6zWQX3bbVm0PJzqFOF4Yqse-LttmDpOUkDJ4EdZUSnDBJPzo-SgOBEJAogrhVvam67QbjP33HgDHUvYsPBybMy5fB0y7F_VukjDB_P-fjIKEYU8xY2WeUiCUVr4Dr_wRYKTHNAXoOdyI007V_Xj2x-Y1EG3HswTRFhSbrwEh3f_eBxvhNVwUh2raG0hqdB6oZGQ944Os39vCAumr0Bw_cQBpZUMRKhhHszNZAoGNHNZMy2D5-pFOBOTRroWhUGNY7rAhZ-vU4u1Mtb8ixDXMpsmi4Xjj5geZWkk4MnxixPhahlfV3JCbFSnC5kHjHBqa3--8Vf966IwLjAmuA4JjaybzN0USCtHRsHyvvuHIV9zyKS94bCpnmcBf1bVNpECFx85rIOaV4uWOkwox-HQyyHHtHpvFa-lpX0Bmeyxox0l6ElTtes0FzaLqsuwWEf3zD6HQOtka8iI8-2VmlY9fRS; _ga=GA1.1.577689209.1761381649; _fbp=fb.1.1761381649604.1640540731; tta_attr_id_mirror=0.1762268458.7568885393215471624; _ga_HV1FL86553=GS2.1.s1762268561$o1$g1$t1762268561$j60$l0$h1139544813; _tt_enable_cookie=1; _ga_Y2RSHPPW88=GS2.1.s1762268563$o1$g1$t1762268563$j60$l0$h1997141982; FPID=FPID2.2.%2BXM3aio64K66NDWf0kOmNXMYxe4RL8fhWeyXAeNBbcU%3D.1761381649; FPAU=1.2.1082480070.1762268564; ttcsid=1762268562540::6FucUPHzvEpTru5WDUp_.1.1762268565296.0; ttcsid_C97F14JC77U63IDI7U40=1762268562540::yqh2-N3WPLgW0pBUVs3W.1.1762268565296.0; ttwid=1%7C1df4v1kSJWaG6o3k4egwx3_4OfVfAmapsHNo9UIj6fY%7C1762268921%7Ce606ddbde774957b7e91c85cb45d234f9a5dac5f155ebf1dd6f096d501754d8e; _ttp=352iezLSIuvJKOWoZ6pkcY557y2; tt_csrf_token=5dBRdan5-P5SfGdFHaLjN7I4AaTbQG4v4qdk; s_v_web_id=verify_mhr3rphf_UlHNBJkQ_Gefj_4MEK_9ezO_RJBs2qXnbhSO; ttwid=1%7C1df4v1kSJWaG6o3k4egwx3_4OfVfAmapsHNo9UIj6fY%7C1762655841%7Cf7c77a62ea05ff4f119f3bb4e668d4e43171908e236007d784f74a6e3e2eb5cb; store-country-sign=MEIEDHJqAZMbV2oIv6C_ygQgIdLcNo0HG9oiFFwVWsWIRXpo68BPE4QV3XBf6mO__E4EEF3T_hKptVzRmaK57ho9YJ4; dkms-type=0; FPLC=WwIzCV5G%2FYmd4%2Fvj5FxqgoigljDvykb7m1Ive754d06qVixnoI11gl%2FK3cU2Ma9AZhKDjcWvNAOrwOqAC7fDwQ6pJ3OeJ9fQ8b%2BVBS0nyYc896F7r9ELdjzQEOpvrw%3D%3D; odin_tt=32295041f13c66c28605dbf7bbe57f7c284c97442986f551c419bca4e5d1d04bc43af2d7a7e14448b5aa4dc87191d525c6311c8f5fad0b595e6341087ba18f5b680dd3f6e40ef369c01cf625e027ca56; webID=7564990269181232660; dkms-token=MIGPBAymjXwHJXBtbFGjBoIEbZPjrEnGCwDYHC49Atcr4H3l0LUia1oeCCQnhe8SV61O33xCUb9Lyb+VeOIGdz8CnLI8Nf2bPXQ8n42MYq7yQXaZSS17FnhmL6BiHdZzsfRRDcS29uCrOl09Iv3mC6k1I0ofUjxXuqYM3+9c2zUEEOA2xRfSwT+/XF1SDJUxqJE=; _ga_NBFTJ2P3P3=GS1.1.1762656087.3.1.1762658299.0.0.1615842262; msToken=1oRZZxcnD0yoPn7RzIuuQrbnhEACqQSMdgm5pxM_waSyUKSnPKw26uPLgIxIQ5AelxJLeILHXxC5PZ3Co2kEJlMkWF0jDtmUA1Sx-AMeD-Zdk6fISpd5BPyH9Usuz4R59dUDYR1ZWg==; msToken=1oRZZxcnD0yoPn7RzIuuQrbnhEACqQSMdgm5pxM_waSyUKSnPKw26uPLgIxIQ5AelxJLeILHXxC5PZ3Co2kEJlMkWF0jDtmUA1Sx-AMeD-Zdk6fISpd5BPyH9Usuz4R59dUDYR1ZWg==' \
--data-raw '{"product_id":"1730584769274152937","page_start":2,"page_size":500,"sort_rule":2,"review_filter":{"filter_type":1,"filter_value":6}}'`;

exec(curlCmd, (error, stdout, stderr) => {
  if (error) {
    console.error("❌ Error:", error);
    return;
  }
  if (stderr) {
    console.error("⚠️ Stderr:", stderr);
  }

  // stdout 就是请求结果
  console.log("✅ Response (raw string):", stdout);

  // 如果返回的是 JSON，可以解析：
  try {
    const data = JSON.parse(stdout);
    console.log("✅ Parsed JSON:", data);
  } catch (err) {
    console.error("❌ JSON parse error:", err);
  }
});