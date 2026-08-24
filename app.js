// Innisfree SA Dashboard Logic with Data Key Normalization

document.addEventListener('DOMContentLoaded', () => {
  // --- Password Gate Logic ---
  const SECRET_PASS = 'innisfree11!';
  const overlay = document.getElementById('passwordModalOverlay');
  const pwdInput = document.getElementById('accessPasswordInput');
  const pwdBtn = document.getElementById('btnCheckPassword');
  const pwdError = document.getElementById('passwordErrorMsg');

  const checkAuth = () => {
    if (sessionStorage.getItem('sa_dashboard_authed') === 'true') {
      if (overlay) overlay.style.display = 'none';
      return true;
    }
    return false;
  };

  const tryAuth = () => {
    if (!pwdInput) return;
    if (pwdInput.value === SECRET_PASS) {
      sessionStorage.setItem('sa_dashboard_authed', 'true');
      if (overlay) {
        overlay.style.opacity = '0';
        overlay.style.transition = 'opacity 0.3s ease';
        setTimeout(() => { overlay.style.display = 'none'; }, 300);
      }
    } else {
      if (pwdError) pwdError.style.display = 'block';
      pwdInput.value = '';
      pwdInput.focus();
    }
  };

  if (!checkAuth()) {
    if (pwdBtn) pwdBtn.addEventListener('click', tryAuth);
    if (pwdInput) {
      pwdInput.addEventListener('keyup', (e) => {
        if (e.key === 'Enter') tryAuth();
      });
      setTimeout(() => pwdInput.focus(), 100);
    }
  }

  let currentMonth = '8';
  let currentWeek = 'ALL';
  let activeTab = 'tab-overview';
  
  let powerlinkActiveChips = new Set();
  let powerlinkActiveSearchTypes = new Set();
  let shoppingActiveChips = new Set();
  let newproductActiveChips = new Set();

  let powerlinkTopCategory = 'Revenue'; // Revenue, Roas, LowRoas
  let powerlinkGrowthCategory = 'wow'; // wow, mom
  let charts = {};

  // Formatter Helpers
  const fmtNum = (v) => Math.round(v || 0).toLocaleString('ko-KR');
  const fmtCurr = (v) => Math.round(v || 0).toLocaleString('ko-KR') + '원';
  const fmtPct = (v) => (v || 0).toFixed(2) + '%';
  const fmtRoas = (v) => (v || 0).toFixed(1) + '%';

  const getRoasBadgeClass = (roas) => {
    if (roas >= 500) return 'roas-high';
    if (roas >= 300) return 'roas-mid';
    return 'roas-low';
  };

  const getDiffBadge = (diffVal) => {
    if (diffVal > 0) {
      return `<span class="diff-badge diff-up">▲ +${diffVal.toFixed(1)}%p</span>`;
    } else if (diffVal < 0) {
      return `<span class="diff-badge diff-down">▼ ${Math.abs(diffVal).toFixed(1)}%p</span>`;
    } else {
      return `<span class="diff-badge diff-neutral">- 0.0%p</span>`;
    }
  };

  // Standardize Data Items (Map short keys m, ct, w, c, ag, kw, pn, sid, i, cl, cvat, cnovat, cv, r)
  const normalizeItem = (item) => {
    if (!item) return {};
    return {
      Month: item.Month || item.m || '',
      Week: item.Week || item.w || '',
      CampaignType: item.CampaignType || item.ct || '',
      Campaign: item.Campaign || item.c || '',
      AdGroupCat: item.AdGroupCat || item.ag || '',
      Keyword: item.Keyword || item.kw || '',
      SearchType: item.SearchType || item.st || '',
      ProductName: item.ProductName || item.pn || '',
      SojaeId: item.SojaeId || item.sid || '',
      Imp: item.Imp !== undefined ? item.Imp : (item.i || 0),
      Clk: item.Clk !== undefined ? item.Clk : (item.cl || 0),
      CostVat: item.CostVat !== undefined ? item.CostVat : (item.cvat || 0),
      CostNoVat: item.CostNoVat !== undefined ? item.CostNoVat : (item.cnovat || 0),
      Conv: item.Conv !== undefined ? item.Conv : (item.cv || 0),
      Revenue: item.Revenue !== undefined ? item.Revenue : (item.r || 0)
    };
  };

  let normalizedData = null;

  const getData = () => {
    if (normalizedData) return normalizedData;
    if (typeof DASHBOARD_DATA === 'undefined') {
      console.error('DASHBOARD_DATA missing!');
      return { months: [], weeks: [], adGroupCats: [], groups: [], keywords: [], products: [] };
    }
    normalizedData = {
      months: DASHBOARD_DATA.months || [],
      weeks: DASHBOARD_DATA.weeks || [],
      adGroupCats: DASHBOARD_DATA.adGroupCats || [],
      groups: (DASHBOARD_DATA.groups || []).map(normalizeItem),
      keywords: (DASHBOARD_DATA.keywords || []).map(normalizeItem),
      products: (DASHBOARD_DATA.products || []).map(normalizeItem)
    };
    return normalizedData;
  };

  // Populate Week Selector Options
  const updateWeekOptions = () => {
    const raw = getData();
    const weekSelect = document.getElementById('weekSelect');
    if (!weekSelect) return;

    let availableWeeks = new Set();
    const sourceList = raw.groups.length > 0 ? raw.groups : raw.keywords;
    
    sourceList.forEach(item => {
      if (currentMonth === 'ALL' || String(item.Month) === String(currentMonth)) {
        if (item.Week) availableWeeks.add(item.Week);
      }
    });

    const sortedWeeks = Array.from(availableWeeks).sort();
    
    let html = `<option value="ALL" ${currentWeek === 'ALL' ? 'selected' : ''}>선택월 전체</option>`;
    sortedWeeks.forEach(w => {
      html += `<option value="${w}" ${currentWeek === w ? 'selected' : ''}>${w}</option>`;
    });
    weekSelect.innerHTML = html;
  };

  // Filter Functions
  const filterByMonthOnly = (list) => {
    return list.filter(item => {
      if (currentMonth !== 'ALL' && String(item.Month) !== String(currentMonth)) return false;
      return true;
    });
  };

  const filterList = (list) => {
    return list.filter(item => {
      if (currentMonth !== 'ALL' && String(item.Month) !== String(currentMonth)) return false;
      if (currentWeek !== 'ALL' && String(item.Week) !== String(currentWeek)) return false;
      return true;
    });
  };

  // Event Listeners for Filters
  const monthSelect = document.getElementById('monthSelect');
  if (monthSelect) {
    monthSelect.value = currentMonth;
    monthSelect.addEventListener('change', (e) => {
      currentMonth = e.target.value;
      currentWeek = 'ALL';
      updateWeekOptions();
      updateDashboard();
    });
  }

  const weekSelect = document.getElementById('weekSelect');
  if (weekSelect) {
    weekSelect.addEventListener('change', (e) => {
      currentWeek = e.target.value;
      updateDashboard();
    });
  }

  // Tab Switching Logic
  const tabBtns = document.querySelectorAll('.tab-btn');
  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      tabBtns.forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
      
      btn.classList.add('active');
      activeTab = btn.getAttribute('data-tab');
      document.getElementById(activeTab).classList.add('active');

      renderTabSpecificKPIs(filterList(getData().groups));

      setTimeout(() => {
        Object.values(charts).forEach(chart => chart && chart.resize());
      }, 50);
    });
  });

  // Render Top KPI Summary Cards (Dynamic per Active Tab!)
  const renderTabSpecificKPIs = (filteredGroups) => {
    let targetGroups = filteredGroups;
    let badgeText = '전체 캠페인';

    if (activeTab === 'tab-powerlink') {
      targetGroups = filteredGroups.filter(g => g.CampaignType === '파워링크');
      badgeText = '파워링크 전용';
    } else if (activeTab === 'tab-shopping') {
      targetGroups = filteredGroups.filter(g => g.CampaignType === '쇼핑검색');
      badgeText = '쇼핑검색 전용';
    } else if (activeTab === 'tab-newproduct') {
      targetGroups = filteredGroups.filter(g => g.CampaignType === '신제품검색');
      badgeText = '신제품검색 전용';
    }

    let costNoVat = 0, costVat = 0, rev = 0, conv = 0, clk = 0, imp = 0;
    
    targetGroups.forEach(w => {
      costNoVat += w.CostNoVat || 0;
      costVat += w.CostVat || 0;
      rev += w.Revenue || 0;
      conv += w.Conv || 0;
      clk += w.Clk || 0;
      imp += w.Imp || 0;
    });

    const roas = costNoVat > 0 ? (rev / costNoVat) * 100 : 0;
    const aov = conv > 0 ? rev / conv : 0;
    const ctr = imp > 0 ? (clk / imp) * 100 : 0;
    const cpc = clk > 0 ? costNoVat / clk : 0;

    const badgeEl = document.getElementById('kpiBadgeTab');
    if (badgeEl) badgeEl.innerText = badgeText;

    document.getElementById('kpiTotalCostNoVat').innerText = fmtCurr(costNoVat);
    document.getElementById('kpiCostVat').innerText = fmtCurr(costVat);
    document.getElementById('kpiTotalRevenue').innerText = fmtCurr(rev);
    document.getElementById('kpiTotalConv').innerText = fmtNum(conv) + '건';
    document.getElementById('kpiRoas').innerText = fmtRoas(roas);
    document.getElementById('kpiAov').innerText = fmtCurr(aov);
    document.getElementById('kpiTotalClicks').innerText = fmtNum(clk) + '회';
    document.getElementById('kpiCtr').innerText = fmtPct(ctr);
    document.getElementById('kpiCpc').innerText = fmtCurr(cpc);
  };

  // Render Insights Comments
  const renderAllTabInsights = (allGroups) => {
    const filterText = currentMonth === 'ALL' ? '전체 기간' : `${currentMonth}월 ${currentWeek === 'ALL' ? '전체' : currentWeek}`;

    // 1. Overview Insights
    const ovBox = document.getElementById('overviewInsightList');
    if (ovBox) {
      let costSum = 0, revSum = 0;
      let ctypeStats = {};
      
      allGroups.forEach(w => {
        costSum += w.CostNoVat || 0;
        revSum += w.Revenue || 0;
        if (!ctypeStats[w.CampaignType]) {
          ctypeStats[w.CampaignType] = { cost: 0, rev: 0, conv: 0, clk: 0 };
        }
        ctypeStats[w.CampaignType].cost += w.CostNoVat || 0;
        ctypeStats[w.CampaignType].rev += w.Revenue || 0;
        ctypeStats[w.CampaignType].conv += w.Conv || 0;
        ctypeStats[w.CampaignType].clk += w.Clk || 0;
      });

      const totalRoas = costSum > 0 ? (revSum / costSum) * 100 : 0;

      ovBox.innerHTML = `
        <div class="insight-item positive">
          <h4>📊 1. [${filterText}] 전체 성과 요약</h4>
          <p>총 광고비(VAT제외) <strong>${fmtCurr(costSum)}</strong> 집행, 총 전환매출액 <strong>${fmtCurr(revSum)}</strong> 달성으로 평균 ROAS <strong>${fmtRoas(totalRoas)}</strong>의 견고한 효율을 기록했습니다.</p>
        </div>
        <div class="insight-item info">
          <h4>📅 2. 주차별 성과 요약</h4>
          <p>8월 1주차 프로모션 기획전 특수로 ROAS 1,000% 이상 폭발적 성과를 거두었으며, 2~3주차에도 주차별 1.5억~2억대 안정적 매출선 유지 중입니다.</p>
        </div>
        <div class="insight-item warning">
          <h4>🏢 3. 그룹별 성과 요약</h4>
          <p>자사명 브랜딩 그룹(ROAS 1,200%+) 및 카테고리 대표 상품군(선케어/파우더)이 전체 매출 및 효율 성장의 대부분을 형성하고 있습니다.</p>
        </div>
        <div class="insight-item positive">
          <h4>🚀 4. 매출 & ROAS 견인 요약</h4>
          <p>쇼핑검색 대표 상품 <strong>이니스프리 선크림 / 파우더 더블기획</strong> 소재 및 파워링크 <strong>[이니스프리]</strong> 자사명 키워드가 성장의 핵심 모멘텀입니다.</p>
        </div>
      `;
    }

    // 2. Powerlink Insights
    const plBox = document.getElementById('powerlinkInsightList');
    if (plBox) {
      const plGroups = allGroups.filter(g => g.CampaignType === '파워링크');
      let plCost = 0, plRev = 0;
      plGroups.forEach(g => { plCost += g.CostNoVat || 0; plRev += g.Revenue || 0; });
      const plRoas = plCost > 0 ? (plRev / plCost) * 100 : 0;

      plBox.innerHTML = `
        <div class="insight-item positive">
          <h4>📊 1. [${filterText}] 파워링크 전체 성과 요약</h4>
          <p>파워링크 광고비 <strong>${fmtCurr(plCost)}</strong> 투입으로 매출액 <strong>${fmtCurr(plRev)}</strong>, ROAS <strong>${fmtRoas(plRoas)}</strong> 달성.</p>
        </div>
        <div class="insight-item info">
          <h4>📅 2. 주차별 성과 요약</h4>
          <p>주차별 광고비 소진 대비 ROAS 400%~520% 수준을 꾸준히 유지하며 검색 유입 고객의 구매 전환율을 방어하고 있습니다.</p>
        </div>
        <div class="insight-item warning">
          <h4>🏢 3. 그룹별 성과 요약 (자사명 vs 제품군)</h4>
          <p>[자사명] 그룹이 ROAS 1,000% 이상으로 압도적이며, [제품군/일반키워드] 그룹은 인지 및 탐색 확장 레이어 역할을 수행 중입니다.</p>
        </div>
        <div class="insight-item positive">
          <h4>🚀 4. 매출 & ROAS 견인 키워드 요약</h4>
          <p>매출 견인 1위: <strong>[이니스프리]</strong> | ROAS 견인 1위: <strong>[이니스프리 노세범]</strong> (저효율 키워드 입찰가 튜닝 필요).</p>
        </div>
      `;
    }

    // 3. Shopping Insights
    const spBox = document.getElementById('shoppingInsightList');
    if (spBox) {
      const spGroups = allGroups.filter(g => g.CampaignType === '쇼핑검색');
      let spCost = 0, spRev = 0;
      spGroups.forEach(g => { spCost += g.CostNoVat || 0; spRev += g.Revenue || 0; });
      const spRoas = spCost > 0 ? (spRev / spCost) * 100 : 0;

      spBox.innerHTML = `
        <div class="insight-item positive">
          <h4>📊 1. [${filterText}] 쇼핑검색 전체 성과 요약</h4>
          <p>쇼핑검색 광고비 <strong>${fmtCurr(spCost)}</strong>로 총 <strong>${fmtCurr(spRev)}</strong>의 매출을 창출 (전체 매출의 98% 담당, ROAS <strong>${fmtRoas(spRoas)}</strong>).</p>
        </div>
        <div class="insight-item info">
          <h4>📅 2. 주차별 성과 요약</h4>
          <p>8월 1주차 딜 프로모션 주간에 ROAS 1,000%를 돌파하였으며, 2~3주차에도 높은 딜 반응도가 지속되고 있습니다.</p>
        </div>
        <div class="insight-item warning">
          <h4>🏢 3. 그룹별 성과 요약</h4>
          <p>[1_카테고리_선케어] 및 [B.자사명] 그룹이 세일즈 볼륨의 85% 이상을 상회하며 핵심 라인업으로 안착.</p>
        </div>
        <div class="insight-item positive">
          <h4>🚀 4. 매출 & ROAS 견인 상품 요약</h4>
          <p>매출 견인 1위: <strong>이니스프리 히알루론 수분 선크림 50ml 더블기획</strong> (단일 상품 매출 최고치 달성).</p>
        </div>
      `;
    }

    // 4. NewProduct Insights
    const npBox = document.getElementById('newproductInsightList');
    if (npBox) {
      const npGroups = allGroups.filter(g => g.CampaignType === '신제품검색');
      let npClk = 0;
      npGroups.forEach(g => { npClk += g.Clk || 0; });

      npBox.innerHTML = `
        <div class="insight-item positive">
          <h4>📊 1. [${filterText}] 신제품검색 전체 성과 요약</h4>
          <p>신제품 론칭 라인업 총 클릭수 <strong>${fmtNum(npClk)}회</strong> 확보로 브랜드 신규 아이템 탐색 모멘텀 형성.</p>
        </div>
        <div class="insight-item info">
          <h4>📅 2. 주차별 성과 요약</h4>
          <p>주차별 CTR 4.2% ~ 5.4% 수준의 독보적 타겟 반응률을 나타내며 타겟 유입 효율 극대화.</p>
        </div>
        <div class="insight-item warning">
          <h4>🏢 3. 그룹별 성과 요약 (자외선차단제 등 포함)</h4>
          <p>[자외선차단제] 및 신제품 대표 라인업 그룹이 관심 수요를 집중 수용 중입니다.</p>
        </div>
        <div class="insight-item positive">
          <h4>🚀 4. 매출 & ROAS 견인 키워드 요약</h4>
          <p>신제품 메인 타겟 키워드 <strong>[신제품 선크림], [이니스프리 자외선차단제]</strong>가 신규 시드 유입을 완벽히 견인 중입니다.</p>
        </div>
      `;
    }
  };

  // Helper to Aggregate Weekly Data for Table Below Chart (FIXED TO MONTH TOTAL)
  const renderWeeklyTableBelowChart = (tableId, monthOnlyGroups) => {
    const tbody = document.querySelector(`#${tableId} tbody`);
    if (!tbody) return;

    const weekMap = {};
    let totalImp = 0, totalClk = 0, totalCostNoVat = 0, totalConv = 0, totalRev = 0;

    monthOnlyGroups.forEach(w => {
      const wKey = w.Week || '기타';
      if (!weekMap[wKey]) {
        weekMap[wKey] = { Imp: 0, Clk: 0, CostNoVat: 0, Conv: 0, Revenue: 0 };
      }
      weekMap[wKey].Imp += w.Imp || 0;
      weekMap[wKey].Clk += w.Clk || 0;
      weekMap[wKey].CostNoVat += w.CostNoVat || 0;
      weekMap[wKey].Conv += w.Conv || 0;
      weekMap[wKey].Revenue += w.Revenue || 0;

      totalImp += w.Imp || 0;
      totalClk += w.Clk || 0;
      totalCostNoVat += w.CostNoVat || 0;
      totalConv += w.Conv || 0;
      totalRev += w.Revenue || 0;
    });

    const mTitle = currentMonth === 'ALL' ? '전체' : `${currentMonth}월`;
    const totalCtr = totalImp > 0 ? (totalClk / totalImp) * 100 : 0;
    const totalRoas = totalCostNoVat > 0 ? (totalRev / totalCostNoVat) * 100 : 0;
    const totalAov = totalConv > 0 ? totalRev / totalConv : 0;
    const totalCpc = totalClk > 0 ? totalCostNoVat / totalClk : 0;

    let html = `
      <tr class="highlight-row">
        <td>🌿 ${mTitle} 전체</td>
        <td class="number-col">${fmtNum(totalImp)}</td>
        <td class="number-col">${fmtNum(totalClk)}</td>
        <td class="number-col">${fmtPct(totalCtr)}</td>
        <td class="number-col">${fmtCurr(totalCostNoVat)}</td>
        <td class="number-col">${fmtNum(totalConv)}</td>
        <td class="number-col">${fmtCurr(totalRev)}</td>
        <td class="number-col"><span class="roas-badge ${getRoasBadgeClass(totalRoas)}">${fmtRoas(totalRoas)}</span></td>
        <td class="number-col">${fmtCurr(totalAov)}</td>
        <td class="number-col">${fmtCurr(totalCpc)}</td>
      </tr>
    `;

    const sortedWeekKeys = Object.keys(weekMap).sort();
    sortedWeekKeys.forEach(wKey => {
      const item = weekMap[wKey];
      const ctr = item.Imp > 0 ? (item.Clk / item.Imp) * 100 : 0;
      const roas = item.CostNoVat > 0 ? (item.Revenue / item.CostNoVat) * 100 : 0;
      const aov = item.Conv > 0 ? item.Revenue / item.Conv : 0;
      const cpc = item.Clk > 0 ? item.CostNoVat / item.Clk : 0;

      html += `
        <tr>
          <td>${wKey}</td>
          <td class="number-col">${fmtNum(item.Imp)}</td>
          <td class="number-col">${fmtNum(item.Clk)}</td>
          <td class="number-col">${fmtPct(ctr)}</td>
          <td class="number-col">${fmtCurr(item.CostNoVat)}</td>
          <td class="number-col">${fmtNum(item.Conv)}</td>
          <td class="number-col">${fmtCurr(item.Revenue)}</td>
          <td class="number-col"><span class="roas-badge ${getRoasBadgeClass(roas)}">${fmtRoas(roas)}</span></td>
          <td class="number-col">${fmtCurr(aov)}</td>
          <td class="number-col">${fmtCurr(cpc)}</td>
        </tr>
      `;
    });

    tbody.innerHTML = html;
  };

  // Overview Tab: Campaign Type Table with WoW & MoM ROAS Diff
  const renderOverviewCampaignTypeTable = (filteredGroups, rawData) => {
    const tbody = document.querySelector('#tableCampaignTypeOverview tbody');
    if (!tbody) return;

    const ctypes = ['쇼핑검색', '파워링크', '신제품검색'];
    const currentStats = {};
    ctypes.forEach(ct => { currentStats[ct] = { Imp: 0, Clk: 0, CostNoVat: 0, Conv: 0, Revenue: 0 }; });

    filteredGroups.forEach(w => {
      if (currentStats[w.CampaignType]) {
        currentStats[w.CampaignType].Imp += w.Imp || 0;
        currentStats[w.CampaignType].Clk += w.Clk || 0;
        currentStats[w.CampaignType].CostNoVat += w.CostNoVat || 0;
        currentStats[w.CampaignType].Conv += w.Conv || 0;
        currentStats[w.CampaignType].Revenue += w.Revenue || 0;
      }
    });

    // Prev Week (WoW)
    const curMonthWeeks = Array.from(new Set(filteredGroups.map(g => g.Week))).sort();
    const latestWeek = curMonthWeeks[curMonthWeeks.length - 1];
    const allWeeks = Array.from(new Set(rawData.groups.map(g => g.Week))).sort();
    const latestIdx = allWeeks.indexOf(latestWeek);
    const prevWeek = latestIdx > 0 ? allWeeks[latestIdx - 1] : null;

    const prevWeekStats = {};
    ctypes.forEach(ct => { prevWeekStats[ct] = { CostNoVat: 0, Revenue: 0 }; });
    if (prevWeek) {
      rawData.groups.filter(g => g.Week === prevWeek).forEach(g => {
        if (prevWeekStats[g.CampaignType]) {
          prevWeekStats[g.CampaignType].CostNoVat += g.CostNoVat || 0;
          prevWeekStats[g.CampaignType].Revenue += g.Revenue || 0;
        }
      });
    }

    // Prev Month (MoM)
    const curM = currentMonth !== 'ALL' ? parseInt(currentMonth) : 8;
    const prevM = curM > 1 ? curM - 1 : 12;
    const prevMonthStats = {};
    ctypes.forEach(ct => { prevMonthStats[ct] = { CostNoVat: 0, Revenue: 0 }; });
    rawData.groups.filter(g => String(g.Month) === String(prevM)).forEach(g => {
      if (prevMonthStats[g.CampaignType]) {
        prevMonthStats[g.CampaignType].CostNoVat += g.CostNoVat || 0;
        prevMonthStats[g.CampaignType].Revenue += g.Revenue || 0;
      }
    });

    let html = '';
    ctypes.forEach(ct => {
      const cur = currentStats[ct];
      const ctr = cur.Imp > 0 ? (cur.Clk / cur.Imp) * 100 : 0;
      const roas = cur.CostNoVat > 0 ? (cur.Revenue / cur.CostNoVat) * 100 : 0;
      const aov = cur.Conv > 0 ? cur.Revenue / cur.Conv : 0;
      const cpc = cur.Clk > 0 ? cur.CostNoVat / cur.Clk : 0;

      const pw = prevWeekStats[ct];
      const pwRoas = pw && pw.CostNoVat > 0 ? (pw.Revenue / pw.CostNoVat) * 100 : 0;
      const wowDiff = pwRoas > 0 ? (roas - pwRoas) : 0;

      const pm = prevMonthStats[ct];
      const pmRoas = pm && pm.CostNoVat > 0 ? (pm.Revenue / pm.CostNoVat) * 100 : 0;
      const momDiff = pmRoas > 0 ? (roas - pmRoas) : 0;

      html += `
        <tr>
          <td><span class="kpi-badge">${ct}</span></td>
          <td class="number-col">${fmtNum(cur.Imp)}</td>
          <td class="number-col">${fmtNum(cur.Clk)}</td>
          <td class="number-col">${fmtPct(ctr)}</td>
          <td class="number-col">${fmtCurr(cur.CostNoVat)}</td>
          <td class="number-col">${fmtNum(cur.Conv)}</td>
          <td class="number-col">${fmtCurr(cur.Revenue)}</td>
          <td class="number-col"><span class="roas-badge ${getRoasBadgeClass(roas)}">${fmtRoas(roas)}</span></td>
          <td class="number-col">${getDiffBadge(wowDiff)}</td>
          <td class="number-col">${getDiffBadge(momDiff)}</td>
          <td class="number-col">${fmtCurr(aov)}</td>
          <td class="number-col">${fmtCurr(cpc)}</td>
        </tr>
      `;
    });

    tbody.innerHTML = html;
  };

  // Powerlink AdGroup Category Table
  const renderPowerlinkAdGroupCats = (plGroups) => {
    const tbody = document.querySelector('#tablePowerlinkAdGroupCat tbody');
    const chipContainer = document.getElementById('powerlinkAdGroupChips');

    const catMap = {};
    plGroups.forEach(g => {
      const cat = g.AdGroupCat || '미지정';
      if (!catMap[cat]) {
        catMap[cat] = { Cat: cat, Imp: 0, Clk: 0, CostNoVat: 0, Conv: 0, Revenue: 0 };
      }
      catMap[cat].Imp += g.Imp || 0;
      catMap[cat].Clk += g.Clk || 0;
      catMap[cat].CostNoVat += g.CostNoVat || 0;
      catMap[cat].Conv += g.Conv || 0;
      catMap[cat].Revenue += g.Revenue || 0;
    });

    const catList = Object.values(catMap).sort((a, b) => b.Revenue - a.Revenue);

    if (tbody) {
      const html = catList.map(item => {
        const ctr = item.Imp > 0 ? (item.Clk / item.Imp) * 100 : 0;
        const roas = item.CostNoVat > 0 ? (item.Revenue / item.CostNoVat) * 100 : 0;
        const aov = item.Conv > 0 ? item.Revenue / item.Conv : 0;
        const cpc = item.Clk > 0 ? item.CostNoVat / item.Clk : 0;

        return `
          <tr>
            <td><strong>${item.Cat}</strong></td>
            <td class="number-col">${fmtNum(item.Imp)}</td>
            <td class="number-col">${fmtNum(item.Clk)}</td>
            <td class="number-col">${fmtPct(ctr)}</td>
            <td class="number-col">${fmtCurr(item.CostNoVat)}</td>
            <td class="number-col">${fmtNum(item.Conv)}</td>
            <td class="number-col">${fmtCurr(item.Revenue)}</td>
            <td class="number-col"><span class="roas-badge ${getRoasBadgeClass(roas)}">${fmtRoas(roas)}</span></td>
            <td class="number-col">${fmtCurr(aov)}</td>
            <td class="number-col">${fmtCurr(cpc)}</td>
          </tr>
        `;
      }).join('');
      tbody.innerHTML = html || `<tr><td colspan="10" style="text-align:center;">데이터 없음</td></tr>`;
    }

    if (chipContainer) {
      const allBtnClass = powerlinkActiveChips.size === 0 ? 'chip-btn active' : 'chip-btn';
      let chipsHtml = `<button class="${allBtnClass}" data-cat="ALL">전체 보기 (${catList.length})</button>`;

      catList.forEach(c => {
        const isActive = powerlinkActiveChips.has(c.Cat) ? 'chip-btn active' : 'chip-btn';
        chipsHtml += `<button class="${isActive}" data-cat="${c.Cat}">${c.Cat}</button>`;
      });

      chipContainer.innerHTML = chipsHtml;

      chipContainer.querySelectorAll('.chip-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          const cat = btn.getAttribute('data-cat');
          if (cat === 'ALL') {
            powerlinkActiveChips.clear();
          } else {
            if (powerlinkActiveChips.has(cat)) powerlinkActiveChips.delete(cat);
            else powerlinkActiveChips.add(cat);
          }
          renderPowerlinkAdGroupCats(plGroups);
          if (updatePowerlinkKwTable) updatePowerlinkKwTable();
        });
      });
    }
  };

  // Powerlink Search Type Chips Filter
  const renderPowerlinkSearchTypeChips = (plKwList) => {
    const chipContainer = document.getElementById('powerlinkSearchTypeChips');
    if (!chipContainer) return;

    const typeSet = new Set();
    plKwList.forEach(k => {
      if (k.SearchType) typeSet.add(k.SearchType);
    });

    const typeList = Array.from(typeSet).sort();
    const allBtnClass = powerlinkActiveSearchTypes.size === 0 ? 'chip-btn active' : 'chip-btn';
    let chipsHtml = `<button class="${allBtnClass}" data-type="ALL">전체 유형 보기</button>`;

    typeList.forEach(t => {
      const isActive = powerlinkActiveSearchTypes.has(t) ? 'chip-btn active' : 'chip-btn';
      chipsHtml += `<button class="${isActive}" data-type="${t}">${t}</button>`;
    });

    chipContainer.innerHTML = chipsHtml;

    chipContainer.querySelectorAll('.chip-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const type = btn.getAttribute('data-type');
        if (type === 'ALL') {
          powerlinkActiveSearchTypes.clear();
        } else {
          if (powerlinkActiveSearchTypes.has(type)) powerlinkActiveSearchTypes.delete(type);
          else powerlinkActiveSearchTypes.add(type);
        }
        renderPowerlinkSearchTypeChips(plKwList);
        if (updatePowerlinkKwTable) updatePowerlinkKwTable();
      });
    });
  };

  // Powerlink PC / MO Campaign Table with Shaded Summaries
  const renderPowerlinkDeviceTable = (plGroups) => {
    const tbody = document.querySelector('#tablePowerlinkDeviceCampaign tbody');
    if (!tbody) return;

    const campMap = {};
    let totalPc = { Imp: 0, Clk: 0, CostNoVat: 0, Conv: 0, Revenue: 0 };
    let totalMo = { Imp: 0, Clk: 0, CostNoVat: 0, Conv: 0, Revenue: 0 };

    plGroups.forEach(g => {
      const cName = g.Campaign || '미지정';
      if (!campMap[cName]) {
        campMap[cName] = { Campaign: cName, Imp: 0, Clk: 0, CostNoVat: 0, Conv: 0, Revenue: 0 };
      }
      campMap[cName].Imp += g.Imp || 0;
      campMap[cName].Clk += g.Clk || 0;
      campMap[cName].CostNoVat += g.CostNoVat || 0;
      campMap[cName].Conv += g.Conv || 0;
      campMap[cName].Revenue += g.Revenue || 0;

      const isMo = cName.toUpperCase().includes('MO') || cName.includes('모바일');
      if (isMo) {
        totalMo.Imp += g.Imp || 0; totalMo.Clk += g.Clk || 0; totalMo.CostNoVat += g.CostNoVat || 0; totalMo.Conv += g.Conv || 0; totalMo.Revenue += g.Revenue || 0;
      } else {
        totalPc.Imp += g.Imp || 0; totalPc.Clk += g.Clk || 0; totalPc.CostNoVat += g.CostNoVat || 0; totalPc.Conv += g.Conv || 0; totalPc.Revenue += g.Revenue || 0;
      }
    });

    const list = Object.values(campMap).sort((a, b) => b.CostNoVat - a.CostNoVat);

    const moCtr = totalMo.Imp > 0 ? (totalMo.Clk / totalMo.Imp) * 100 : 0;
    const moRoas = totalMo.CostNoVat > 0 ? (totalMo.Revenue / totalMo.CostNoVat) * 100 : 0;
    const moAov = totalMo.Conv > 0 ? totalMo.Revenue / totalMo.Conv : 0;
    const moCpc = totalMo.Clk > 0 ? totalMo.CostNoVat / totalMo.Clk : 0;

    const pcCtr = totalPc.Imp > 0 ? (totalPc.Clk / totalPc.Imp) * 100 : 0;
    const pcRoas = totalPc.CostNoVat > 0 ? (totalPc.Revenue / totalPc.CostNoVat) * 100 : 0;
    const pcAov = totalPc.Conv > 0 ? totalPc.Revenue / totalPc.Conv : 0;
    const pcCpc = totalPc.Clk > 0 ? totalPc.CostNoVat / totalPc.Clk : 0;

    let html = `
      <tr class="summary-shaded-row">
        <td><span class="tag-mo">전체 MO 요약</span></td>
        <td><strong>모바일(MO) 캠페인 전체 합계</strong></td>
        <td class="number-col">${fmtNum(totalMo.Imp)}</td>
        <td class="number-col">${fmtNum(totalMo.Clk)}</td>
        <td class="number-col">${fmtPct(moCtr)}</td>
        <td class="number-col">${fmtCurr(totalMo.CostNoVat)}</td>
        <td class="number-col">${fmtNum(totalMo.Conv)}</td>
        <td class="number-col">${fmtCurr(totalMo.Revenue)}</td>
        <td class="number-col"><span class="roas-badge ${getRoasBadgeClass(moRoas)}">${fmtRoas(moRoas)}</span></td>
        <td class="number-col">${fmtCurr(moAov)}</td>
        <td class="number-col">${fmtCurr(moCpc)}</td>
      </tr>
      <tr class="summary-shaded-row">
        <td><span class="tag-pc">전체 PC 요약</span></td>
        <td><strong>PC 캠페인 전체 합계</strong></td>
        <td class="number-col">${fmtNum(totalPc.Imp)}</td>
        <td class="number-col">${fmtNum(totalPc.Clk)}</td>
        <td class="number-col">${fmtPct(pcCtr)}</td>
        <td class="number-col">${fmtCurr(totalPc.CostNoVat)}</td>
        <td class="number-col">${fmtNum(totalPc.Conv)}</td>
        <td class="number-col">${fmtCurr(totalPc.Revenue)}</td>
        <td class="number-col"><span class="roas-badge ${getRoasBadgeClass(pcRoas)}">${fmtRoas(pcRoas)}</span></td>
        <td class="number-col">${fmtCurr(pcAov)}</td>
        <td class="number-col">${fmtCurr(pcCpc)}</td>
      </tr>
    `;

    html += list.map(item => {
      const isMo = item.Campaign.toUpperCase().includes('MO') || item.Campaign.includes('모바일');
      const tag = isMo ? '<span class="tag-mo">MO</span>' : '<span class="tag-pc">PC</span>';
      const ctr = item.Imp > 0 ? (item.Clk / item.Imp) * 100 : 0;
      const roas = item.CostNoVat > 0 ? (item.Revenue / item.CostNoVat) * 100 : 0;
      const aov = item.Conv > 0 ? item.Revenue / item.Conv : 0;
      const cpc = item.Clk > 0 ? item.CostNoVat / item.Clk : 0;

      return `
        <tr>
          <td>${tag}</td>
          <td><strong>${item.Campaign}</strong></td>
          <td class="number-col">${fmtNum(item.Imp)}</td>
          <td class="number-col">${fmtNum(item.Clk)}</td>
          <td class="number-col">${fmtPct(ctr)}</td>
          <td class="number-col">${fmtCurr(item.CostNoVat)}</td>
          <td class="number-col">${fmtNum(item.Conv)}</td>
          <td class="number-col">${fmtCurr(item.Revenue)}</td>
          <td class="number-col"><span class="roas-badge ${getRoasBadgeClass(roas)}">${fmtRoas(roas)}</span></td>
          <td class="number-col">${fmtCurr(aov)}</td>
          <td class="number-col">${fmtCurr(cpc)}</td>
        </tr>
      `;
    }).join('');

    tbody.innerHTML = html;
  };

  // Powerlink TOP 10 Keywords Table (Revenue / Roas from Top 20 Spend / LowRoas < 500%)
  const renderPowerlinkTop10Kw = (plKeywords) => {
    const tbody = document.querySelector('#tablePowerlinkKwTop10 tbody');
    if (!tbody) return;

    const kwMap = {};
    plKeywords.forEach(k => {
      const kw = k.Keyword;
      if (!kwMap[kw]) {
        kwMap[kw] = { Keyword: kw, Imp: 0, Clk: 0, CostNoVat: 0, Conv: 0, Revenue: 0 };
      }
      kwMap[kw].Imp += k.Imp || 0;
      kwMap[kw].Clk += k.Clk || 0;
      kwMap[kw].CostNoVat += k.CostNoVat || 0;
      kwMap[kw].Conv += k.Conv || 0;
      kwMap[kw].Revenue += k.Revenue || 0;
    });

    let list = Object.values(kwMap);

    if (powerlinkTopCategory === 'Revenue') {
      list.sort((a, b) => b.Revenue - a.Revenue);
    } else if (powerlinkTopCategory === 'Roas') {
      // Filter for Top 20 by Spend (광고비소진 상위 20개) as requested!
      list.sort((a, b) => b.CostNoVat - a.CostNoVat);
      const top20Spend = list.slice(0, 20);
      top20Spend.sort((a, b) => {
        const roasA = a.CostNoVat > 0 ? a.Revenue / a.CostNoVat : 0;
        const roasB = b.CostNoVat > 0 ? b.Revenue / b.CostNoVat : 0;
        return roasB - roasA;
      });
      list = top20Spend;
    } else if (powerlinkTopCategory === 'LowRoas') {
      // ROAS < 500% low efficiency keywords (sorted by CostNoVat desc) as requested!
      list = list.filter(item => {
        const roas = item.CostNoVat > 0 ? (item.Revenue / item.CostNoVat) * 100 : 0;
        return item.CostNoVat > 0 && roas < 500;
      }).sort((a, b) => b.CostNoVat - a.CostNoVat);
    }

    const top10 = list.slice(0, 10);

    const html = top10.map((k, idx) => {
      const ctr = k.Imp > 0 ? (k.Clk / k.Imp) * 100 : 0;
      const roas = k.CostNoVat > 0 ? (k.Revenue / k.CostNoVat) * 100 : 0;
      const aov = k.Conv > 0 ? k.Revenue / k.Conv : 0;
      const cpc = k.Clk > 0 ? k.CostNoVat / k.Clk : 0;

      return `
        <tr>
          <td><strong>#${idx + 1}</strong></td>
          <td><strong>${k.Keyword}</strong></td>
          <td class="number-col">${fmtNum(k.Imp)}</td>
          <td class="number-col">${fmtNum(k.Clk)}</td>
          <td class="number-col">${fmtPct(ctr)}</td>
          <td class="number-col">${fmtCurr(k.CostNoVat)}</td>
          <td class="number-col">${fmtNum(k.Conv)}</td>
          <td class="number-col">${fmtCurr(k.Revenue)}</td>
          <td class="number-col"><span class="roas-badge ${getRoasBadgeClass(roas)}">${fmtRoas(roas)}</span></td>
          <td class="number-col">${fmtCurr(aov)}</td>
          <td class="number-col">${fmtCurr(cpc)}</td>
        </tr>
      `;
    }).join('');

    tbody.innerHTML = html || `<tr><td colspan="11" style="text-align:center;">데이터 없음</td></tr>`;
  };

  // Top 10 Subtab Event Listeners
  const top10Btns = document.querySelectorAll('#kwTop10Group .subtab-btn');
  top10Btns.forEach(btn => {
    btn.addEventListener('click', () => {
      top10Btns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      powerlinkTopCategory = btn.getAttribute('data-top');
      const filteredKw = filterList(getData().keywords.filter(k => k.CampaignType === '파워링크'));
      renderPowerlinkTop10Kw(filteredKw);
    });
  });

  // Powerlink ROAS Growth Split into 2 Cards (Up: Increased ROAS / Down: Decreased ROAS from Top 30 Spend)
  const renderPowerlinkKwGrowthSplit = (rawData) => {
    const tbodyUp = document.querySelector('#tablePowerlinkKwGrowthUp tbody');
    const tbodyDown = document.querySelector('#tablePowerlinkKwGrowthDown tbody');
    if (!tbodyUp || !tbodyDown) return;

    const plKeywords = rawData.keywords.filter(k => k.CampaignType === '파워링크');
    
    // Filter to Top 30 Spend Keywords
    const totalKwSpend = {};
    plKeywords.forEach(k => {
      if (!totalKwSpend[k.Keyword]) totalKwSpend[k.Keyword] = 0;
      totalKwSpend[k.Keyword] += k.CostNoVat || 0;
    });

    const top30KwSet = new Set(
      Object.keys(totalKwSpend).sort((a, b) => totalKwSpend[b] - totalKwSpend[a]).slice(0, 30)
    );

    const isWow = powerlinkGrowthCategory === 'wow';
    const kwCurMap = {};
    const kwPrevMap = {};

    if (isWow) {
      const allWeeks = Array.from(new Set(plKeywords.map(k => k.Week))).sort();
      const latestWeek = currentWeek !== 'ALL' ? currentWeek : allWeeks[allWeeks.length - 1];
      const latestIdx = allWeeks.indexOf(latestWeek);
      const prevWeek = latestIdx > 0 ? allWeeks[latestIdx - 1] : null;

      plKeywords.forEach(k => {
        if (!top30KwSet.has(k.Keyword)) return;
        if (k.Week === latestWeek) {
          if (!kwCurMap[k.Keyword]) kwCurMap[k.Keyword] = { Keyword: k.Keyword, CostNoVat: 0, Revenue: 0 };
          kwCurMap[k.Keyword].CostNoVat += k.CostNoVat || 0;
          kwCurMap[k.Keyword].Revenue += k.Revenue || 0;
        }
        if (prevWeek && k.Week === prevWeek) {
          if (!kwPrevMap[k.Keyword]) kwPrevMap[k.Keyword] = { Keyword: k.Keyword, CostNoVat: 0, Revenue: 0 };
          kwPrevMap[k.Keyword].CostNoVat += k.CostNoVat || 0;
          kwPrevMap[k.Keyword].Revenue += k.Revenue || 0;
        }
      });
    } else {
      const curM = currentMonth !== 'ALL' ? parseInt(currentMonth) : 8;
      const prevM = curM > 1 ? curM - 1 : 12;

      plKeywords.forEach(k => {
        if (!top30KwSet.has(k.Keyword)) return;
        if (String(k.Month) === String(curM)) {
          if (!kwCurMap[k.Keyword]) kwCurMap[k.Keyword] = { Keyword: k.Keyword, CostNoVat: 0, Revenue: 0 };
          kwCurMap[k.Keyword].CostNoVat += k.CostNoVat || 0;
          kwCurMap[k.Keyword].Revenue += k.Revenue || 0;
        }
        if (String(k.Month) === String(prevM)) {
          if (!kwPrevMap[k.Keyword]) kwPrevMap[k.Keyword] = { Keyword: k.Keyword, CostNoVat: 0, Revenue: 0 };
          kwPrevMap[k.Keyword].CostNoVat += k.CostNoVat || 0;
          kwPrevMap[k.Keyword].Revenue += k.Revenue || 0;
        }
      });
    }

    const growthList = [];
    Object.keys(kwCurMap).forEach(kw => {
      const cur = kwCurMap[kw];
      const prev = kwPrevMap[kw];

      const curRoas = cur.CostNoVat > 0 ? (cur.Revenue / cur.CostNoVat) * 100 : 0;
      const prevRoas = prev && prev.CostNoVat > 0 ? (prev.Revenue / prev.CostNoVat) * 100 : 0;
      const diff = curRoas - prevRoas;

      growthList.push({
        Keyword: kw, CurRoas: curRoas, PrevRoas: prevRoas, Diff: diff, CostNoVat: cur.CostNoVat, Revenue: cur.Revenue
      });
    });

    const upList = growthList.filter(item => item.Diff >= 0).sort((a, b) => b.Diff - a.Diff).slice(0, 10);
    const htmlUp = upList.map((item, idx) => `
      <tr>
        <td><strong>#${idx + 1}</strong></td>
        <td><strong>${item.Keyword}</strong></td>
        <td class="number-col">${fmtRoas(item.CurRoas)}</td>
        <td class="number-col">${fmtRoas(item.PrevRoas)}</td>
        <td class="number-col">${getDiffBadge(item.Diff)}</td>
        <td class="number-col">${fmtCurr(item.CostNoVat)}</td>
        <td class="number-col">${fmtCurr(item.Revenue)}</td>
      </tr>
    `).join('');
    tbodyUp.innerHTML = htmlUp || `<tr><td colspan="7" style="text-align:center;">데이터 없음</td></tr>`;

    const downList = growthList.filter(item => item.Diff < 0).sort((a, b) => a.Diff - b.Diff).slice(0, 10);
    const htmlDown = downList.map((item, idx) => `
      <tr>
        <td><strong>#${idx + 1}</strong></td>
        <td><strong>${item.Keyword}</strong></td>
        <td class="number-col">${fmtRoas(item.CurRoas)}</td>
        <td class="number-col">${fmtRoas(item.PrevRoas)}</td>
        <td class="number-col">${getDiffBadge(item.Diff)}</td>
        <td class="number-col">${fmtCurr(item.CostNoVat)}</td>
        <td class="number-col">${fmtCurr(item.Revenue)}</td>
      </tr>
    `).join('');
    tbodyDown.innerHTML = htmlDown || `<tr><td colspan="7" style="text-align:center;">데이터 없음</td></tr>`;
  };

  // Growth Subtab Event Listeners
  const growthBtns = document.querySelectorAll('#kwGrowthGroup .subtab-btn');
  growthBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      growthBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      powerlinkGrowthCategory = btn.getAttribute('data-diff');
      renderPowerlinkKwGrowthSplit(getData());
    });
  });

  // Shopping Tab: AdGroup Categories Performance Table & Chips Filter
  const renderShoppingAdGroupCats = (shoppingGroups) => {
    const tbody = document.querySelector('#tableShoppingAdGroupCat tbody');
    const chipContainer = document.getElementById('shoppingAdGroupChips');

    const catMap = {};
    shoppingGroups.forEach(g => {
      const cat = g.AdGroupCat || '미지정';
      if (!catMap[cat]) {
        catMap[cat] = { Cat: cat, Imp: 0, Clk: 0, CostNoVat: 0, Conv: 0, Revenue: 0 };
      }
      catMap[cat].Imp += g.Imp || 0;
      catMap[cat].Clk += g.Clk || 0;
      catMap[cat].CostNoVat += g.CostNoVat || 0;
      catMap[cat].Conv += g.Conv || 0;
      catMap[cat].Revenue += g.Revenue || 0;
    });

    const catList = Object.values(catMap).sort((a, b) => b.Revenue - a.Revenue);

    if (tbody) {
      const html = catList.map(item => {
        const ctr = item.Imp > 0 ? (item.Clk / item.Imp) * 100 : 0;
        const roas = item.CostNoVat > 0 ? (item.Revenue / item.CostNoVat) * 100 : 0;
        const aov = item.Conv > 0 ? item.Revenue / item.Conv : 0;
        const cpc = item.Clk > 0 ? item.CostNoVat / item.Clk : 0;

        return `
          <tr>
            <td><strong>${item.Cat}</strong></td>
            <td class="number-col">${fmtNum(item.Imp)}</td>
            <td class="number-col">${fmtNum(item.Clk)}</td>
            <td class="number-col">${fmtPct(ctr)}</td>
            <td class="number-col">${fmtCurr(item.CostNoVat)}</td>
            <td class="number-col">${fmtNum(item.Conv)}</td>
            <td class="number-col">${fmtCurr(item.Revenue)}</td>
            <td class="number-col"><span class="roas-badge ${getRoasBadgeClass(roas)}">${fmtRoas(roas)}</span></td>
            <td class="number-col">${fmtCurr(aov)}</td>
            <td class="number-col">${fmtCurr(cpc)}</td>
          </tr>
        `;
      }).join('');
      tbody.innerHTML = html || `<tr><td colspan="10" style="text-align:center;">데이터 없음</td></tr>`;
    }

    if (chipContainer) {
      const allBtnClass = shoppingActiveChips.size === 0 ? 'chip-btn active' : 'chip-btn';
      let chipsHtml = `<button class="${allBtnClass}" data-cat="ALL">전체 보기 (${catList.length})</button>`;

      catList.forEach(c => {
        const isActive = shoppingActiveChips.has(c.Cat) ? 'chip-btn active' : 'chip-btn';
        chipsHtml += `<button class="${isActive}" data-cat="${c.Cat}">${c.Cat}</button>`;
      });

      chipContainer.innerHTML = chipsHtml;

      chipContainer.querySelectorAll('.chip-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          const cat = btn.getAttribute('data-cat');
          if (cat === 'ALL') {
            shoppingActiveChips.clear();
          } else {
            if (shoppingActiveChips.has(cat)) shoppingActiveChips.delete(cat);
            else shoppingActiveChips.add(cat);
          }
          renderShoppingAdGroupCats(shoppingGroups);
          updateShoppingFilteredTables();
        });
      });
    }
  };

  // NewProduct Tab: AdGroup Categories Performance Table & Chips Filter
  const renderNewproductAdGroupCats = (npGroups) => {
    const tbody = document.querySelector('#tableNewproductAdGroupCat tbody');
    const chipContainer = document.getElementById('newproductAdGroupChips');

    const catMap = {};
    npGroups.forEach(g => {
      const cat = g.AdGroupCat || '미지정';
      if (!catMap[cat]) {
        catMap[cat] = { Cat: cat, Imp: 0, Clk: 0, CostNoVat: 0, Conv: 0, Revenue: 0 };
      }
      catMap[cat].Imp += g.Imp || 0;
      catMap[cat].Clk += g.Clk || 0;
      catMap[cat].CostNoVat += g.CostNoVat || 0;
      catMap[cat].Conv += g.Conv || 0;
      catMap[cat].Revenue += g.Revenue || 0;
    });

    const catList = Object.values(catMap).sort((a, b) => b.Clk - a.Clk);

    if (tbody) {
      const html = catList.map(item => {
        const ctr = item.Imp > 0 ? (item.Clk / item.Imp) * 100 : 0;
        const roas = item.CostNoVat > 0 ? (item.Revenue / item.CostNoVat) * 100 : 0;
        const aov = item.Conv > 0 ? item.Revenue / item.Conv : 0;
        const cpc = item.Clk > 0 ? item.CostNoVat / item.Clk : 0;

        return `
          <tr>
            <td><strong>${item.Cat}</strong></td>
            <td class="number-col">${fmtNum(item.Imp)}</td>
            <td class="number-col">${fmtNum(item.Clk)}</td>
            <td class="number-col">${fmtPct(ctr)}</td>
            <td class="number-col">${fmtCurr(item.CostNoVat)}</td>
            <td class="number-col">${fmtNum(item.Conv)}</td>
            <td class="number-col">${fmtCurr(item.Revenue)}</td>
            <td class="number-col"><span class="roas-badge ${getRoasBadgeClass(roas)}">${fmtRoas(roas)}</span></td>
            <td class="number-col">${fmtCurr(aov)}</td>
            <td class="number-col">${fmtCurr(cpc)}</td>
          </tr>
        `;
      }).join('');
      tbody.innerHTML = html || `<tr><td colspan="10" style="text-align:center;">데이터 없음</td></tr>`;
    }

    if (chipContainer) {
      const allBtnClass = newproductActiveChips.size === 0 ? 'chip-btn active' : 'chip-btn';
      let chipsHtml = `<button class="${allBtnClass}" data-cat="ALL">전체 보기 (${catList.length})</button>`;

      catList.forEach(c => {
        const isActive = newproductActiveChips.has(c.Cat) ? 'chip-btn active' : 'chip-btn';
        chipsHtml += `<button class="${isActive}" data-cat="${c.Cat}">${c.Cat}</button>`;
      });

      chipContainer.innerHTML = chipsHtml;

      chipContainer.querySelectorAll('.chip-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          const cat = btn.getAttribute('data-cat');
          if (cat === 'ALL') {
            newproductActiveChips.clear();
          } else {
            if (newproductActiveChips.has(cat)) newproductActiveChips.delete(cat);
            else newproductActiveChips.add(cat);
          }
          renderNewproductAdGroupCats(npGroups);
          updateNewproductFilteredTables();
        });
      });
    }
  };

  // Render Top Charts (ALWAYS Month Total for Selected Month)
  const renderCharts = (monthOnlyGroups) => {
    // 1. Overview Dual-Axis Chart
    const weekMap = {};
    monthOnlyGroups.forEach(w => {
      const weekLabel = w.Week || '기타';
      if (!weekMap[weekLabel]) weekMap[weekLabel] = { CostNoVat: 0, Rev: 0 };
      weekMap[weekLabel].CostNoVat += w.CostNoVat || 0;
      weekMap[weekLabel].Rev += w.Revenue || 0;
    });

    const labels = Object.keys(weekMap).sort();
    const costs = labels.map(l => weekMap[l].CostNoVat);
    const revs = labels.map(l => weekMap[l].Rev);
    const roases = labels.map(l => weekMap[l].CostNoVat > 0 ? Math.round((weekMap[l].Rev / weekMap[l].CostNoVat) * 100) : 0);

    if (charts.overview) charts.overview.destroy();
    const ctxOverview = document.getElementById('chartWeeklyOverview');
    if (ctxOverview) {
      charts.overview = new Chart(ctxOverview, {
        type: 'bar',
        data: {
          labels: labels,
          datasets: [
            { label: '전환매출액 (원)', data: revs, backgroundColor: 'rgba(5, 150, 105, 0.8)', borderColor: '#059669', borderWidth: 1, yAxisID: 'y' },
            { label: '총광고비 (VAT제외)', data: costs, backgroundColor: 'rgba(0, 102, 51, 0.7)', borderColor: '#006633', borderWidth: 1, yAxisID: 'y' },
            { label: 'ROAS (%)', data: roases, type: 'line', borderColor: '#d97706', backgroundColor: '#d97706', borderWidth: 3, pointRadius: 5, yAxisID: 'y1' }
          ]
        },
        options: {
          responsive: true, maintainAspectRatio: false,
          interaction: { mode: 'index', intersect: false },
          plugins: { legend: { labels: { color: '#111827' } } },
          scales: {
            x: { ticks: { color: '#4b5563' } },
            y: { position: 'left', ticks: { color: '#4b5563', callback: v => (v / 10000).toLocaleString() + '만' } },
            y1: { position: 'right', ticks: { color: '#d97706', callback: v => v + '%' }, grid: { drawOnChartArea: false } }
          }
        }
      });
    }

    // 2. Campaign Share Donut Chart
    let ctypeRev = { '쇼핑검색': 0, '파워링크': 0, '신제품검색': 0 };
    monthOnlyGroups.forEach(w => {
      if (ctypeRev[w.CampaignType] !== undefined) ctypeRev[w.CampaignType] += w.Revenue || 0;
    });

    if (charts.share) charts.share.destroy();
    const ctxShare = document.getElementById('chartCampaignShare');
    if (ctxShare) {
      charts.share = new Chart(ctxShare, {
        type: 'doughnut',
        data: {
          labels: ['쇼핑검색', '파워링크', '신제품검색'],
          datasets: [{
            data: [ctypeRev['쇼핑검색'], ctypeRev['파워링크'], ctypeRev['신제품검색']],
            backgroundColor: ['#059669', '#006633', '#d97706'],
            borderColor: '#ffffff'
          }]
        },
        options: {
          responsive: true, maintainAspectRatio: false,
          plugins: { legend: { position: 'bottom', labels: { color: '#111827' } } }
        }
      });
    }

    // 3. Powerlink Weekly Chart
    const plWeeklyMap = {};
    monthOnlyGroups.filter(w => w.CampaignType === '파워링크').forEach(w => {
      const wLabel = w.Week || '기타';
      if (!plWeeklyMap[wLabel]) plWeeklyMap[wLabel] = { CostNoVat: 0, Rev: 0 };
      plWeeklyMap[wLabel].CostNoVat += w.CostNoVat || 0;
      plWeeklyMap[wLabel].Rev += w.Revenue || 0;
    });

    const plLabels = Object.keys(plWeeklyMap).sort();
    const plRevs = plLabels.map(l => plWeeklyMap[l].Rev);
    const plRoases = plLabels.map(l => plWeeklyMap[l].CostNoVat > 0 ? Math.round((plWeeklyMap[l].Rev / plWeeklyMap[l].CostNoVat) * 100) : 0);

    if (charts.powerlink) charts.powerlink.destroy();
    const ctxPl = document.getElementById('chartPowerlinkWeekly');
    if (ctxPl) {
      charts.powerlink = new Chart(ctxPl, {
        type: 'bar',
        data: {
          labels: plLabels,
          datasets: [
            { label: '전환매출액 (원)', data: plRevs, backgroundColor: 'rgba(5, 150, 105, 0.8)', borderColor: '#059669', borderWidth: 1, yAxisID: 'y' },
            { label: 'ROAS (%)', data: plRoases, type: 'line', borderColor: '#d97706', backgroundColor: '#d97706', borderWidth: 3, pointRadius: 5, yAxisID: 'y1' }
          ]
        },
        options: {
          responsive: true, maintainAspectRatio: false,
          plugins: { legend: { labels: { color: '#111827' } } },
          scales: {
            x: { ticks: { color: '#4b5563' } },
            y: { position: 'left', ticks: { color: '#4b5563', callback: v => (v / 10000).toLocaleString() + '만' } },
            y1: { position: 'right', ticks: { color: '#d97706', callback: v => v + '%' }, grid: { drawOnChartArea: false } }
          }
        }
      });
    }

    // 4. Shopping Weekly Chart
    const spWeeklyMap = {};
    monthOnlyGroups.filter(w => w.CampaignType === '쇼핑검색').forEach(w => {
      const wLabel = w.Week || '기타';
      if (!spWeeklyMap[wLabel]) spWeeklyMap[wLabel] = { CostNoVat: 0, Rev: 0 };
      spWeeklyMap[wLabel].CostNoVat += w.CostNoVat || 0;
      spWeeklyMap[wLabel].Rev += w.Revenue || 0;
    });

    const spLabels = Object.keys(spWeeklyMap).sort();
    const spRevs = spLabels.map(l => spWeeklyMap[l].Rev);
    const spCosts = spLabels.map(l => spWeeklyMap[l].CostNoVat);

    if (charts.shopping) charts.shopping.destroy();
    const ctxSp = document.getElementById('chartShoppingWeekly');
    if (ctxSp) {
      charts.shopping = new Chart(ctxSp, {
        type: 'bar',
        data: {
          labels: spLabels,
          datasets: [
            { label: '전환매출액 (원)', data: spRevs, backgroundColor: 'rgba(5, 150, 105, 0.8)', borderColor: '#059669', borderWidth: 1 },
            { label: '총광고비 (VAT제외)', data: spCosts, backgroundColor: 'rgba(0, 102, 51, 0.7)', borderColor: '#006633', borderWidth: 1 }
          ]
        },
        options: {
          responsive: true, maintainAspectRatio: false,
          plugins: { legend: { labels: { color: '#111827' } } },
          scales: { x: { ticks: { color: '#4b5563' } }, y: { ticks: { color: '#4b5563', callback: v => (v / 10000).toLocaleString() + '만' } } }
        }
      });
    }

    // 5. NewProduct Weekly Chart (Metrics: Clicks & ROAS as requested!)
    const npWeeklyMap = {};
    monthOnlyGroups.filter(w => w.CampaignType === '신제품검색').forEach(w => {
      const wLabel = w.Week || '기타';
      if (!npWeeklyMap[wLabel]) npWeeklyMap[wLabel] = { Clk: 0, CostNoVat: 0, Rev: 0 };
      npWeeklyMap[wLabel].Clk += w.Clk || 0;
      npWeeklyMap[wLabel].CostNoVat += w.CostNoVat || 0;
      npWeeklyMap[wLabel].Rev += w.Revenue || 0;
    });

    const npLabels = Object.keys(npWeeklyMap).sort();
    const npClks = npLabels.map(l => npWeeklyMap[l].Clk);
    const npRoases = npLabels.map(l => npWeeklyMap[l].CostNoVat > 0 ? Math.round((npWeeklyMap[l].Rev / npWeeklyMap[l].CostNoVat) * 100) : 0);

    if (charts.newproduct) charts.newproduct.destroy();
    const ctxNp = document.getElementById('chartNewproductWeekly');
    if (ctxNp) {
      charts.newproduct = new Chart(ctxNp, {
        type: 'bar',
        data: {
          labels: npLabels,
          datasets: [
            { label: '클릭수 (회)', data: npClks, backgroundColor: 'rgba(217, 119, 6, 0.8)', borderColor: '#d97706', borderWidth: 1, yAxisID: 'y' },
            { label: 'ROAS (%)', data: npRoases, type: 'line', borderColor: '#059669', backgroundColor: '#059669', borderWidth: 3, pointRadius: 5, yAxisID: 'y1' }
          ]
        },
        options: {
          responsive: true, maintainAspectRatio: false,
          plugins: { legend: { labels: { color: '#111827' } } },
          scales: {
            x: { ticks: { color: '#4b5563' } },
            y: { position: 'left', ticks: { color: '#4b5563' } },
            y1: { position: 'right', ticks: { color: '#059669', callback: v => v + '%' }, grid: { drawOnChartArea: false } }
          }
        }
      });
    }
  };

  // Reusable Table Component Helper
  const setupTable = (config) => {
    const { tableId, searchId, countId, pageInfoId, prevBtnId, nextBtnId, getRawData, renderRow, pageSize = 15, defaultSort = 'CostNoVat' } = config;

    let sortCol = defaultSort;
    let sortDir = 'desc';
    let currentPage = 1;
    let filteredList = [];

    const searchInput = document.getElementById(searchId);
    const prevBtn = document.getElementById(prevBtnId);
    const nextBtn = document.getElementById(nextBtnId);
    const pageInfo = document.getElementById(pageInfoId);
    const countInfo = document.getElementById(countId);
    const tbody = document.querySelector(`#${tableId} tbody`);
    const thList = document.querySelectorAll(`#${tableId} th.sortable`);

    const updateTable = () => {
      let list = getRawData();

      const query = searchInput ? searchInput.value.trim().toLowerCase() : '';
      if (query) {
        list = list.filter(item => {
          return Object.values(item).some(v => String(v).toLowerCase().includes(query));
        });
      }

      list.sort((a, b) => {
        let valA = a[sortCol];
        let valB = b[sortCol];
        
        if (sortCol === 'Ctr') {
          valA = a.Imp > 0 ? a.Clk / a.Imp : 0;
          valB = b.Imp > 0 ? b.Clk / b.Imp : 0;
        } else if (sortCol === 'Roas') {
          valA = a.CostNoVat > 0 ? a.Revenue / a.CostNoVat : 0;
          valB = b.CostNoVat > 0 ? b.Revenue / b.CostNoVat : 0;
        } else if (sortCol === 'Aov') {
          valA = a.Conv > 0 ? a.Revenue / a.Conv : 0;
          valB = b.Conv > 0 ? b.Revenue / b.Conv : 0;
        } else if (sortCol === 'Cpc') {
          valA = a.Clk > 0 ? a.CostNoVat / a.Clk : 0;
          valB = b.Clk > 0 ? b.CostNoVat / b.Clk : 0;
        }

        if (typeof valA === 'string') {
          return sortDir === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
        }
        return sortDir === 'asc' ? (valA || 0) - (valB || 0) : (valB || 0) - (valA || 0);
      });

      filteredList = list;
      const totalCount = filteredList.length;
      const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
      if (currentPage > totalPages) currentPage = totalPages;

      if (countInfo) countInfo.innerText = `총 ${totalCount.toLocaleString()}개`;

      const start = (currentPage - 1) * pageSize;
      const pageData = filteredList.slice(start, start + pageSize);

      if (tbody) {
        if (pageData.length === 0) {
          tbody.innerHTML = `<tr><td colspan="12" style="text-align:center; padding:24px; color:var(--text-muted);">조회된 데이터가 없습니다.</td></tr>`;
        } else {
          tbody.innerHTML = pageData.map(item => renderRow(item)).join('');
        }
      }

      if (pageInfo) pageInfo.innerText = `Page ${currentPage} of ${totalPages}`;
      if (prevBtn) prevBtn.disabled = currentPage <= 1;
      if (nextBtn) nextBtn.disabled = currentPage >= totalPages;

      thList.forEach(th => {
        th.classList.remove('sort-asc', 'sort-desc');
        if (th.getAttribute('data-sort') === sortCol) {
          th.classList.add(sortDir === 'asc' ? 'sort-asc' : 'sort-desc');
        }
      });
    };

    if (searchInput) searchInput.addEventListener('input', () => { currentPage = 1; updateTable(); });
    if (prevBtn) prevBtn.addEventListener('click', () => { if (currentPage > 1) { currentPage--; updateTable(); } });
    if (nextBtn) nextBtn.addEventListener('click', () => { currentPage++; updateTable(); });

    thList.forEach(th => {
      th.addEventListener('click', () => {
        const col = th.getAttribute('data-sort');
        if (sortCol === col) {
          sortDir = sortDir === 'asc' ? 'desc' : 'asc';
        } else {
          sortCol = col;
          sortDir = 'desc';
        }
        updateTable();
      });
    });

    return updateTable;
  };

  let updatePowerlinkKwTable = null;
  let updateShoppingProdTable = null;
  let updateShoppingKwTable = null;
  let updateNewproductKwTable = null;

  const updateShoppingFilteredTables = () => {
    if (updateShoppingProdTable) updateShoppingProdTable();
    if (updateShoppingKwTable) updateShoppingKwTable();
  };

  const updateNewproductFilteredTables = () => {
    if (updateNewproductKwTable) updateNewproductKwTable();
  };

  // Main Tables Component Handler
  const initTables = (monthOnlyGroups, filteredGroups, filteredKw, filteredProd) => {
    // 1. Weekly Tables Below Charts (FIXED TO MONTH TOTAL)
    renderWeeklyTableBelowChart('tableWeeklyDataOverview', monthOnlyGroups);
    renderWeeklyTableBelowChart('tablePowerlinkWeekly', monthOnlyGroups.filter(g => g.CampaignType === '파워링크'));
    renderWeeklyTableBelowChart('tableShoppingWeekly', monthOnlyGroups.filter(g => g.CampaignType === '쇼핑검색'));
    renderWeeklyTableBelowChart('tableNewproductWeekly', monthOnlyGroups.filter(g => g.CampaignType === '신제품검색'));

    // 2. Overview Campaign Type Table with WoW & MoM ROAS Diff
    renderOverviewCampaignTypeTable(filteredGroups, getData());

    // 3. Powerlink AdGroup Category Table & Chips Toggle
    const plKw = filteredKw.filter(k => k.CampaignType === '파워링크');
    renderPowerlinkAdGroupCats(filteredGroups.filter(g => g.CampaignType === '파워링크'));
    renderPowerlinkSearchTypeChips(plKw);

    const btnToggleChips = document.getElementById('btnTogglePowerlinkChips');
    const chipBox = document.getElementById('powerlinkAdGroupChips');
    if (btnToggleChips && chipBox) {
      btnToggleChips.onclick = () => {
        chipBox.classList.toggle('expanded');
        if (chipBox.classList.contains('expanded')) {
          btnToggleChips.innerText = '▲ 광고그룹 필터 접기';
        } else {
          btnToggleChips.innerText = '▼ 광고그룹 필터 전체보기 / 펼치기';
        }
      };
    }

    // 4. Powerlink PC / MO Campaign Table with Shaded Summaries
    renderPowerlinkDeviceTable(filteredGroups.filter(g => g.CampaignType === '파워링크'));

    // 5. Powerlink TOP 10 Keywords & Growth Keywords Split
    renderPowerlinkTop10Kw(plKw);
    renderPowerlinkKwGrowthSplit(getData());

    // 6. Bottom Powerlink Keywords Table with Chip Filter, SearchType Filter & Dupe Combination
    updatePowerlinkKwTable = setupTable({
      tableId: 'tablePowerlinkKw',
      searchId: 'searchPowerlinkKw',
      countId: 'countPowerlinkKw',
      pageInfoId: 'pageInfoPowerlinkKw',
      prevBtnId: 'prevPowerlinkKw',
      nextBtnId: 'nextPowerlinkKw',
      getRawData: () => {
        let plList = filteredKw.filter(k => k.CampaignType === '파워링크');
        if (powerlinkActiveChips.size > 0) {
          plList = plList.filter(k => powerlinkActiveChips.has(k.AdGroupCat));
        }
        if (powerlinkActiveSearchTypes.size > 0) {
          plList = plList.filter(k => powerlinkActiveSearchTypes.has(k.SearchType));
        }
        // Combine duplicate keyword names
        const combined = {};
        plList.forEach(k => {
          const kw = k.Keyword;
          if (!combined[kw]) {
            combined[kw] = { Keyword: kw, SearchType: k.SearchType || '-', Imp: 0, Clk: 0, CostNoVat: 0, Conv: 0, Revenue: 0 };
          }
          combined[kw].Imp += k.Imp || 0;
          combined[kw].Clk += k.Clk || 0;
          combined[kw].CostNoVat += k.CostNoVat || 0;
          combined[kw].Conv += k.Conv || 0;
          combined[kw].Revenue += k.Revenue || 0;
        });
        return Object.values(combined);
      },
      defaultSort: 'CostNoVat',
      renderRow: (k) => {
        const ctr = k.Imp > 0 ? (k.Clk / k.Imp) * 100 : 0;
        const roas = k.CostNoVat > 0 ? (k.Revenue / k.CostNoVat) * 100 : 0;
        const aov = k.Conv > 0 ? k.Revenue / k.Conv : 0;
        const cpc = k.Clk > 0 ? k.CostNoVat / k.Clk : 0;
        return `
          <tr>
            <td><strong>${k.Keyword}</strong></td>
            <td><span class="kpi-badge">${k.SearchType || '-'}</span></td>
            <td class="number-col">${fmtNum(k.Imp)}</td>
            <td class="number-col">${fmtNum(k.Clk)}</td>
            <td class="number-col">${fmtPct(ctr)}</td>
            <td class="number-col">${fmtCurr(k.CostNoVat)}</td>
            <td class="number-col">${fmtNum(k.Conv)}</td>
            <td class="number-col">${fmtCurr(k.Revenue)}</td>
            <td class="number-col"><span class="roas-badge ${getRoasBadgeClass(roas)}">${fmtRoas(roas)}</span></td>
            <td class="number-col">${fmtCurr(aov)}</td>
            <td class="number-col">${fmtCurr(cpc)}</td>
          </tr>
        `;
      }
    });
    updatePowerlinkKwTable();

    // 7. Shopping AdGroup Categories & Chip Filters
    const spGroups = filteredGroups.filter(g => g.CampaignType === '쇼핑검색');
    renderShoppingAdGroupCats(spGroups);

    // 8. Shopping Products Table (SojaeId Removed)
    updateShoppingProdTable = setupTable({
      tableId: 'tableShoppingProd',
      searchId: 'searchShoppingProd',
      countId: 'countShoppingProd',
      pageInfoId: 'pageInfoShoppingProd',
      prevBtnId: 'prevShoppingProd',
      nextBtnId: 'nextShoppingProd',
      getRawData: () => {
        let list = filteredProd.filter(p => p.CampaignType === '쇼핑검색');
        if (shoppingActiveChips.size > 0) list = list.filter(p => shoppingActiveChips.has(p.AdGroupCat));
        return list;
      },
      defaultSort: 'Revenue',
      renderRow: (p) => {
        const ctr = p.Imp > 0 ? (p.Clk / p.Imp) * 100 : 0;
        const roas = p.CostNoVat > 0 ? (p.Revenue / p.CostNoVat) * 100 : 0;
        const aov = p.Conv > 0 ? p.Revenue / p.Conv : 0;
        const cpc = p.Clk > 0 ? p.CostNoVat / p.Clk : 0;
        return `
          <tr>
            <td><span class="kpi-badge">${p.AdGroupCat || '-'}</span></td>
            <td><strong>${p.ProductName}</strong></td>
            <td class="number-col">${fmtNum(p.Imp)}</td>
            <td class="number-col">${fmtNum(p.Clk)}</td>
            <td class="number-col">${fmtPct(ctr)}</td>
            <td class="number-col">${fmtCurr(p.CostNoVat)}</td>
            <td class="number-col">${fmtNum(p.Conv)}</td>
            <td class="number-col">${fmtCurr(p.Revenue)}</td>
            <td class="number-col"><span class="roas-badge ${getRoasBadgeClass(roas)}">${fmtRoas(roas)}</span></td>
            <td class="number-col">${fmtCurr(aov)}</td>
            <td class="number-col">${fmtCurr(cpc)}</td>
          </tr>
        `;
      }
    });
    updateShoppingProdTable();

    // 9. Shopping Keywords Table (Combine Duplicates into 1 Row)
    updateShoppingKwTable = setupTable({
      tableId: 'tableShoppingKw',
      searchId: 'searchShoppingKw',
      countId: 'countShoppingKw',
      pageInfoId: 'pageInfoShoppingKw',
      prevBtnId: 'prevShoppingKw',
      nextBtnId: 'nextShoppingKw',
      getRawData: () => {
        let list = filteredKw.filter(k => k.CampaignType === '쇼핑검색');
        if (shoppingActiveChips.size > 0) list = list.filter(k => shoppingActiveChips.has(k.AdGroupCat));
        const combined = {};
        list.forEach(k => {
          const kw = k.Keyword;
          if (!combined[kw]) {
            combined[kw] = { Keyword: kw, AdGroupCat: k.AdGroupCat, Imp: 0, Clk: 0, CostNoVat: 0, Conv: 0, Revenue: 0 };
          }
          combined[kw].Imp += k.Imp || 0;
          combined[kw].Clk += k.Clk || 0;
          combined[kw].CostNoVat += k.CostNoVat || 0;
          combined[kw].Conv += k.Conv || 0;
          combined[kw].Revenue += k.Revenue || 0;
        });
        return Object.values(combined);
      },
      defaultSort: 'Revenue',
      renderRow: (k) => {
        const ctr = k.Imp > 0 ? (k.Clk / k.Imp) * 100 : 0;
        const roas = k.CostNoVat > 0 ? (k.Revenue / k.CostNoVat) * 100 : 0;
        const aov = k.Conv > 0 ? k.Revenue / k.Conv : 0;
        return `
          <tr>
            <td><span class="kpi-badge">${k.AdGroupCat || '-'}</span></td>
            <td><strong>${k.Keyword}</strong></td>
            <td class="number-col">${fmtNum(k.Imp)}</td>
            <td class="number-col">${fmtNum(k.Clk)}</td>
            <td class="number-col">${fmtPct(ctr)}</td>
            <td class="number-col">${fmtCurr(k.CostNoVat)}</td>
            <td class="number-col">${fmtNum(k.Conv)}</td>
            <td class="number-col">${fmtCurr(k.Revenue)}</td>
            <td class="number-col"><span class="roas-badge ${getRoasBadgeClass(roas)}">${fmtRoas(roas)}</span></td>
            <td class="number-col">${fmtCurr(aov)}</td>
          </tr>
        `;
      }
    });
    updateShoppingKwTable();

    // 10. NewProduct Tab: AdGroup Categories & Chips Filter
    const npGroups = filteredGroups.filter(g => g.CampaignType === '신제품검색');
    renderNewproductAdGroupCats(npGroups);

    // 11. NewProduct Keywords Table (Combine Duplicates into 1 Row)
    updateNewproductKwTable = setupTable({
      tableId: 'tableNewproductKw',
      searchId: 'searchNewproductKw',
      countId: 'countNewproductKw',
      pageInfoId: 'pageInfoNewproductKw',
      prevBtnId: 'prevNewproductKw',
      nextBtnId: 'nextNewproductKw',
      getRawData: () => {
        let list = filteredKw.filter(k => k.CampaignType === '신제품검색' || (k.Campaign && k.Campaign.includes('신제품')));
        if (newproductActiveChips.size > 0) list = list.filter(k => newproductActiveChips.has(k.AdGroupCat));
        const combined = {};
        list.forEach(k => {
          const kw = k.Keyword;
          if (!combined[kw]) {
            combined[kw] = { Keyword: kw, AdGroupCat: k.AdGroupCat, Imp: 0, Clk: 0, CostNoVat: 0, Conv: 0, Revenue: 0 };
          }
          combined[kw].Imp += k.Imp || 0;
          combined[kw].Clk += k.Clk || 0;
          combined[kw].CostNoVat += k.CostNoVat || 0;
          combined[kw].Conv += k.Conv || 0;
          combined[kw].Revenue += k.Revenue || 0;
        });
        return Object.values(combined);
      },
      defaultSort: 'Clk',
      renderRow: (k) => {
        const ctr = k.Imp > 0 ? (k.Clk / k.Imp) * 100 : 0;
        const roas = k.CostNoVat > 0 ? (k.Revenue / k.CostNoVat) * 100 : 0;
        const aov = k.Conv > 0 ? k.Revenue / k.Conv : 0;
        return `
          <tr>
            <td><span class="kpi-badge">${k.AdGroupCat || '-'}</span></td>
            <td><strong>${k.Keyword}</strong></td>
            <td class="number-col">${fmtNum(k.Imp)}</td>
            <td class="number-col">${fmtNum(k.Clk)}</td>
            <td class="number-col">${fmtPct(ctr)}</td>
            <td class="number-col">${fmtCurr(k.CostNoVat)}</td>
            <td class="number-col">${fmtNum(k.Conv)}</td>
            <td class="number-col">${fmtCurr(k.Revenue)}</td>
            <td class="number-col"><span class="roas-badge ${getRoasBadgeClass(roas)}">${fmtRoas(roas)}</span></td>
            <td class="number-col">${fmtCurr(aov)}</td>
          </tr>
        `;
      }
    });
    updateNewproductKwTable();
  };

  // Master Dashboard Routine
  const updateDashboard = () => {
    const raw = getData();
    const monthOnlyGroups = filterByMonthOnly(raw.groups);
    const filteredGroups = filterList(raw.groups);
    const filteredKw = filterList(raw.keywords);
    const filteredProd = filterList(raw.products);

    renderTabSpecificKPIs(filteredGroups);
    renderAllTabInsights(filteredGroups);
    renderCharts(monthOnlyGroups); // Fixed to month total for top charts
    initTables(monthOnlyGroups, filteredGroups, filteredKw, filteredProd);
  };

  // Initial Execution
  updateWeekOptions();
  updateDashboard();
});
