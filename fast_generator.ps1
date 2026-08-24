[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$OutputEncoding = [System.Text.Encoding]::UTF8

$code = @"
using System;
using System.Collections.Generic;
using System.IO;
using System.IO.Compression;
using System.Text;
using System.Xml;

public class FastAggregator {
    public class WeeklyItem {
        public string Month { get; set; }
        public string CampaignType { get; set; }
        public string Week { get; set; }
        public string Campaign { get; set; }
        public string AdGroupCat { get; set; }
        public double Imp { get; set; }
        public double Clk { get; set; }
        public double CostVat { get; set; }
        public double CostNoVat { get; set; }
        public double Conv { get; set; }
        public double Revenue { get; set; }
    }

    public class KwItem {
        public string Month { get; set; }
        public string Week { get; set; }
        public string CampaignType { get; set; }
        public string Campaign { get; set; }
        public string AdGroupCat { get; set; }
        public string Keyword { get; set; }
        public double Imp { get; set; }
        public double Clk { get; set; }
        public double CostVat { get; set; }
        public double CostNoVat { get; set; }
        public double Conv { get; set; }
        public double Revenue { get; set; }
    }

    public class ProdItem {
        public string Month { get; set; }
        public string Week { get; set; }
        public string CampaignType { get; set; }
        public string Campaign { get; set; }
        public string AdGroupCat { get; set; }
        public string ProductName { get; set; }
        public string SojaeId { get; set; }
        public double Imp { get; set; }
        public double Clk { get; set; }
        public double CostVat { get; set; }
        public double CostNoVat { get; set; }
        public double Conv { get; set; }
        public double Revenue { get; set; }
    }

    public static void ProcessExcel(string excelPath, string outJsonPath, string outJsPath) {
        List<string> sharedStrings = new List<string>(250000);
        
        using (FileStream fs = File.Open(excelPath, FileMode.Open, FileAccess.Read, FileShare.ReadWrite))
        using (ZipArchive zip = new ZipArchive(fs, ZipArchiveMode.Read)) {
            // 1. Shared Strings
            var sstEntry = zip.GetEntry("xl/sharedStrings.xml");
            if (sstEntry != null) {
                using (var stream = sstEntry.Open())
                using (var xr = XmlReader.Create(stream)) {
                    string curStr = "";
                    bool inT = false;
                    while (xr.Read()) {
                        if (xr.NodeType == XmlNodeType.Element && xr.Name == "si") curStr = "";
                        else if (xr.NodeType == XmlNodeType.Element && xr.Name == "t") inT = true;
                        else if (xr.NodeType == XmlNodeType.Text && inT) curStr += xr.Value;
                        else if (xr.NodeType == XmlNodeType.EndElement && xr.Name == "t") inT = false;
                        else if (xr.NodeType == XmlNodeType.EndElement && xr.Name == "si") sharedStrings.Add(curStr);
                    }
                }
            }

            Dictionary<string, WeeklyItem> groupDict = new Dictionary<string, WeeklyItem>();
            Dictionary<string, KwItem> kwDict = new Dictionary<string, KwItem>();
            Dictionary<string, ProdItem> prodDict = new Dictionary<string, ProdItem>();
            HashSet<string> months = new HashSet<string>();
            HashSet<string> weeks = new HashSet<string>();
            HashSet<string> adGroupCats = new HashSet<string>();

            string newProdStr = "\uC2E0\uC81C\uD488"; // "신제품"

            // 2. Sheet1: Group (네이버_그룹별_RAW)
            var s1 = zip.GetEntry("xl/worksheets/sheet1.xml");
            if (s1 != null) {
                using (var stream = s1.Open())
                using (var xr = XmlReader.Create(stream)) {
                    int rowNum = 0;
                    bool inRow = false;
                    string cellRef = "";
                    string cellType = "";
                    Dictionary<int, string> rowCells = new Dictionary<int, string>();
                    
                    while (xr.Read()) {
                        if (xr.NodeType == XmlNodeType.Element && xr.Name == "row") {
                            rowNum = int.Parse(xr.GetAttribute("r"));
                            inRow = true;
                            rowCells.Clear();
                        } else if (inRow && xr.NodeType == XmlNodeType.Element && xr.Name == "c") {
                            cellRef = xr.GetAttribute("r");
                            cellType = xr.GetAttribute("t");
                        } else if (inRow && xr.NodeType == XmlNodeType.Element && xr.Name == "v") {
                            string valStr = xr.ReadElementContentAsString();
                            string cellVal = valStr;
                            if (cellType == "s") {
                                int idx;
                                if (int.TryParse(valStr, out idx) && idx < sharedStrings.Count) cellVal = sharedStrings[idx];
                            }
                            int colIdx = GetColIdx(cellRef);
                            rowCells[colIdx] = cellVal;
                        } else if (xr.NodeType == XmlNodeType.EndElement && xr.Name == "row") {
                            if (rowNum > 1) {
                                string month = GetVal(rowCells, 1);
                                string week = GetVal(rowCells, 3);
                                string ctype = GetVal(rowCells, 4);
                                string campaign = GetVal(rowCells, 5);
                                string adGroupCat = GetVal(rowCells, 7); // 광고그룹 (H열)
                                double costVat = ParseD(GetVal(rowCells, 9));
                                double costNoVat = ParseD(GetVal(rowCells, 10));
                                double imp = ParseD(GetVal(rowCells, 11));
                                double clk = ParseD(GetVal(rowCells, 12));
                                double conv = ParseD(GetVal(rowCells, 13));
                                double rev = ParseD(GetVal(rowCells, 14));

                                if (!string.IsNullOrEmpty(campaign) && campaign.Contains(newProdStr)) {
                                    ctype = "\uC2E0\uC81C\uD488\uAC80\uC0C9";
                                }

                                if (!string.IsNullOrEmpty(month)) months.Add(month);
                                if (!string.IsNullOrEmpty(week)) weeks.Add(week);
                                if (!string.IsNullOrEmpty(adGroupCat)) adGroupCats.Add(adGroupCat);

                                string gKey = month + "|" + ctype + "|" + week + "|" + campaign + "|" + adGroupCat;
                                WeeklyItem wi;
                                if (!groupDict.TryGetValue(gKey, out wi)) {
                                    wi = new WeeklyItem { Month = month, CampaignType = ctype, Week = week, Campaign = campaign, AdGroupCat = adGroupCat };
                                    groupDict[gKey] = wi;
                                }
                                wi.Imp += imp; wi.Clk += clk; wi.CostVat += costVat; wi.CostNoVat += costNoVat; wi.Conv += conv; wi.Revenue += rev;
                            }
                            inRow = false;
                        }
                    }
                }
            }

            // 3. Sheet2: Keyword (네이버_키워드별_RAW)
            var s2 = zip.GetEntry("xl/worksheets/sheet2.xml");
            if (s2 != null) {
                using (var stream = s2.Open())
                using (var xr = XmlReader.Create(stream)) {
                    int rowNum = 0;
                    bool inRow = false;
                    string cellRef = "";
                    string cellType = "";
                    Dictionary<int, string> rowCells = new Dictionary<int, string>();

                    while (xr.Read()) {
                        if (xr.NodeType == XmlNodeType.Element && xr.Name == "row") {
                            rowNum = int.Parse(xr.GetAttribute("r"));
                            inRow = true;
                            rowCells.Clear();
                        } else if (inRow && xr.NodeType == XmlNodeType.Element && xr.Name == "c") {
                            cellRef = xr.GetAttribute("r");
                            cellType = xr.GetAttribute("t");
                        } else if (inRow && xr.NodeType == XmlNodeType.Element && xr.Name == "v") {
                            string valStr = xr.ReadElementContentAsString();
                            string cellVal = valStr;
                            if (cellType == "s") {
                                int idx;
                                if (int.TryParse(valStr, out idx) && idx < sharedStrings.Count) cellVal = sharedStrings[idx];
                            }
                            int colIdx = GetColIdx(cellRef);
                            rowCells[colIdx] = cellVal;
                        } else if (xr.NodeType == XmlNodeType.EndElement && xr.Name == "row") {
                            if (rowNum > 1) {
                                string month = GetVal(rowCells, 1);
                                string week = GetVal(rowCells, 3);
                                string ctype = GetVal(rowCells, 4);
                                string campaign = GetVal(rowCells, 5);
                                string adGroupCat = GetVal(rowCells, 7); // 광고그룹 (H열)
                                string kw = GetVal(rowCells, 8);
                                double costVat = ParseD(GetVal(rowCells, 11));
                                double costNoVat = ParseD(GetVal(rowCells, 12));
                                double imp = ParseD(GetVal(rowCells, 13));
                                double clk = ParseD(GetVal(rowCells, 14));
                                double conv = ParseD(GetVal(rowCells, 15));
                                double rev = ParseD(GetVal(rowCells, 16));

                                if (!string.IsNullOrEmpty(campaign) && campaign.Contains(newProdStr)) {
                                    ctype = "\uC2E0\uC81C\uD488\uAC80\uC0C9";
                                }

                                if (!string.IsNullOrEmpty(kw) && (imp > 0 || clk > 0 || costNoVat > 0 || conv > 0 || rev > 0)) {
                                    string kKey = month + "|" + week + "|" + ctype + "|" + campaign + "|" + adGroupCat + "|" + kw;
                                    KwItem ki;
                                    if (!kwDict.TryGetValue(kKey, out ki)) {
                                        ki = new KwItem { Month = month, Week = week, CampaignType = ctype, Campaign = campaign, AdGroupCat = adGroupCat, Keyword = kw };
                                        kwDict[kKey] = ki;
                                    }
                                    ki.Imp += imp; ki.Clk += clk; ki.CostVat += costVat; ki.CostNoVat += costNoVat; ki.Conv += conv; ki.Revenue += rev;
                                }
                            }
                            inRow = false;
                        }
                    }
                }
            }

            // 4. Sheet3: Product (네이버_상품별_RAW)
            var s3 = zip.GetEntry("xl/worksheets/sheet3.xml");
            if (s3 != null) {
                using (var stream = s3.Open())
                using (var xr = XmlReader.Create(stream)) {
                    int rowNum = 0;
                    bool inRow = false;
                    string cellRef = "";
                    string cellType = "";
                    Dictionary<int, string> rowCells = new Dictionary<int, string>();

                    while (xr.Read()) {
                        if (xr.NodeType == XmlNodeType.Element && xr.Name == "row") {
                            rowNum = int.Parse(xr.GetAttribute("r"));
                            inRow = true;
                            rowCells.Clear();
                        } else if (inRow && xr.NodeType == XmlNodeType.Element && xr.Name == "c") {
                            cellRef = xr.GetAttribute("r");
                            cellType = xr.GetAttribute("t");
                        } else if (inRow && xr.NodeType == XmlNodeType.Element && xr.Name == "v") {
                            string valStr = xr.ReadElementContentAsString();
                            string cellVal = valStr;
                            if (cellType == "s") {
                                int idx;
                                if (int.TryParse(valStr, out idx) && idx < sharedStrings.Count) cellVal = sharedStrings[idx];
                            }
                            int colIdx = GetColIdx(cellRef);
                            rowCells[colIdx] = cellVal;
                        } else if (xr.NodeType == XmlNodeType.EndElement && xr.Name == "row") {
                            if (rowNum > 1) {
                                string month = GetVal(rowCells, 1);
                                string week = GetVal(rowCells, 3);
                                string ctype = GetVal(rowCells, 4);
                                string campaign = GetVal(rowCells, 5);
                                string adGroupCat = GetVal(rowCells, 7); // 광고그룹 (H열)
                                string sojaeId = GetVal(rowCells, 8);
                                string prodName = GetVal(rowCells, 9);
                                double costVat = ParseD(GetVal(rowCells, 11));
                                double costNoVat = ParseD(GetVal(rowCells, 12));
                                double imp = ParseD(GetVal(rowCells, 13));
                                double clk = ParseD(GetVal(rowCells, 14));
                                double conv = ParseD(GetVal(rowCells, 15));
                                double rev = ParseD(GetVal(rowCells, 16));

                                if (!string.IsNullOrEmpty(campaign) && campaign.Contains(newProdStr)) {
                                    ctype = "\uC2E0\uC81C\uD488\uAC80\uC0C9";
                                }

                                if (!string.IsNullOrEmpty(prodName) && (imp > 0 || clk > 0 || costNoVat > 0 || conv > 0 || rev > 0)) {
                                    string pKey = month + "|" + week + "|" + ctype + "|" + campaign + "|" + adGroupCat + "|" + prodName;
                                    ProdItem pi;
                                    if (!prodDict.TryGetValue(pKey, out pi)) {
                                        pi = new ProdItem { Month = month, Week = week, CampaignType = ctype, Campaign = campaign, AdGroupCat = adGroupCat, ProductName = prodName, SojaeId = sojaeId };
                                        prodDict[pKey] = pi;
                                    }
                                    pi.Imp += imp; pi.Clk += clk; pi.CostVat += costVat; pi.CostNoVat += costNoVat; pi.Conv += conv; pi.Revenue += rev;
                                }
                            }
                            inRow = false;
                        }
                    }
                }
            }

            // Write HIGHLY COMPACT OMIT-ZERO JSON
            var sb = new StringBuilder();
            sb.Append("{\"months\":[").Append(string.Join(",", QuoteAll(months))).Append("],");
            sb.Append("\"weeks\":[").Append(string.Join(",", QuoteAll(weeks))).Append("],");
            sb.Append("\"adGroupCats\":[").Append(string.Join(",", QuoteAll(adGroupCats))).Append("],");

            // Groups
            sb.Append("\"groups\":[");
            int cnt = 0;
            foreach (var kv in groupDict.Values) {
                if (cnt > 0) sb.Append(",");
                sb.Append("{\"m\":\"").Append(Escape(kv.Month))
                  .Append("\",\"w\":\"").Append(Escape(kv.Week))
                  .Append("\",\"ct\":\"").Append(Escape(kv.CampaignType))
                  .Append("\",\"c\":\"").Append(Escape(kv.Campaign))
                  .Append("\",\"ag\":\"").Append(Escape(kv.AdGroupCat)).Append("\"");
                if (kv.Imp > 0) sb.Append(",\"i\":").Append(Round(kv.Imp));
                if (kv.Clk > 0) sb.Append(",\"cl\":").Append(Round(kv.Clk));
                if (kv.CostVat > 0) sb.Append(",\"cvat\":").Append(Round(kv.CostVat));
                if (kv.CostNoVat > 0) sb.Append(",\"cnovat\":").Append(Round(kv.CostNoVat));
                if (kv.Conv > 0) sb.Append(",\"cv\":").Append(Round(kv.Conv));
                if (kv.Revenue > 0) sb.Append(",\"r\":").Append(Round(kv.Revenue));
                sb.Append("}");
                cnt++;
            }
            sb.Append("],");

            // Keywords
            sb.Append("\"keywords\":[");
            cnt = 0;
            foreach (var kv in kwDict.Values) {
                if (cnt > 0) sb.Append(",");
                sb.Append("{\"m\":\"").Append(Escape(kv.Month))
                  .Append("\",\"w\":\"").Append(Escape(kv.Week))
                  .Append("\",\"ct\":\"").Append(Escape(kv.CampaignType))
                  .Append("\",\"c\":\"").Append(Escape(kv.Campaign))
                  .Append("\",\"ag\":\"").Append(Escape(kv.AdGroupCat))
                  .Append("\",\"kw\":\"").Append(Escape(kv.Keyword)).Append("\"");
                if (kv.Imp > 0) sb.Append(",\"i\":").Append(Round(kv.Imp));
                if (kv.Clk > 0) sb.Append(",\"cl\":").Append(Round(kv.Clk));
                if (kv.CostVat > 0) sb.Append(",\"cvat\":").Append(Round(kv.CostVat));
                if (kv.CostNoVat > 0) sb.Append(",\"cnovat\":").Append(Round(kv.CostNoVat));
                if (kv.Conv > 0) sb.Append(",\"cv\":").Append(Round(kv.Conv));
                if (kv.Revenue > 0) sb.Append(",\"r\":").Append(Round(kv.Revenue));
                sb.Append("}");
                cnt++;
            }
            sb.Append("],");

            // Products
            sb.Append("\"products\":[");
            cnt = 0;
            foreach (var kv in prodDict.Values) {
                if (cnt > 0) sb.Append(",");
                sb.Append("{\"m\":\"").Append(Escape(kv.Month))
                  .Append("\",\"w\":\"").Append(Escape(kv.Week))
                  .Append("\",\"ct\":\"").Append(Escape(kv.CampaignType))
                  .Append("\",\"c\":\"").Append(Escape(kv.Campaign))
                  .Append("\",\"ag\":\"").Append(Escape(kv.AdGroupCat))
                  .Append("\",\"pn\":\"").Append(Escape(kv.ProductName))
                  .Append("\",\"sid\":\"").Append(Escape(kv.SojaeId)).Append("\"");
                if (kv.Imp > 0) sb.Append(",\"i\":").Append(Round(kv.Imp));
                if (kv.Clk > 0) sb.Append(",\"cl\":").Append(Round(kv.Clk));
                if (kv.CostVat > 0) sb.Append(",\"cvat\":").Append(Round(kv.CostVat));
                if (kv.CostNoVat > 0) sb.Append(",\"cnovat\":").Append(Round(kv.CostNoVat));
                if (kv.Conv > 0) sb.Append(",\"cv\":").Append(Round(kv.Conv));
                if (kv.Revenue > 0) sb.Append(",\"r\":").Append(Round(kv.Revenue));
                sb.Append("}");
                cnt++;
            }
            sb.Append("]}");

            string jsonResult = sb.ToString();
            File.WriteAllText(outJsonPath, jsonResult, Encoding.UTF8);
            File.WriteAllText(outJsPath, "const DASHBOARD_DATA=" + jsonResult + ";", Encoding.UTF8);
        }
    }

    private static int GetColIdx(string cellRef) {
        int idx = 0;
        for (int i = 0; i < cellRef.Length; i++) {
            char c = cellRef[i];
            if (c >= 'A' && c <= 'Z') idx = idx * 26 + (c - 'A' + 1);
            else break;
        }
        return idx - 1;
    }

    private static string GetVal(Dictionary<int, string> dict, int col) {
        string v;
        if (dict.TryGetValue(col, out v)) return v;
        return "";
    }

    private static double ParseD(string v) {
        double d;
        if (double.TryParse(v, out d)) return d;
        return 0;
    }

    private static double Round(double d) {
        return Math.Round(d, 1);
    }

    private static string Escape(string s) {
        if (s == null) return "";
        return s.Replace("\\", "\\\\").Replace("\"", "\\\"").Replace("\r", "").Replace("\n", " ");
    }

    private static IEnumerable<string> QuoteAll(IEnumerable<string> items) {
        foreach (var item in items) {
            yield return "\"" + Escape(item) + "\"";
        }
    }
}
"@

Add-Type -TypeDefinition $code -ReferencedAssemblies "System.IO.Compression", "System.IO.Compression.FileSystem", "System.Xml"

$excelPath = Join-Path $PSScriptRoot "RAW2.xlsx"
$jsonPath = Join-Path $PSScriptRoot "dashboard_data.json"
$jsPath = Join-Path $PSScriptRoot "dashboard_data.js"

Write-Host "Running zero-omitted compact generator for RAW2.xlsx..."
$sw = [System.Diagnostics.Stopwatch]::StartNew()
[FastAggregator]::ProcessExcel($excelPath, $jsonPath, $jsPath)
$sw.Stop()
Write-Host "Finished processing RAW2.xlsx in $($sw.Elapsed.TotalSeconds) seconds!"
