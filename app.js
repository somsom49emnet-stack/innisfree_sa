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
    const val = (pwdInput.value || '').trim();
    if (val === SECRET_PASS) {
      sessionStorage.setItem('sa_dashboard_authed', 'true');
      if (overlay) overlay.style.display = 'none';
      updateWeekOptions();
      updateDateOptions();
      updateDashboard();
    } else {
      if (pwdError) pwdError.style.display = 'block';
      pwdInput.value = '';
      pwdInput.focus();
    }
  };

  if (!checkAuth()) {
    if (pwdBtn) {
      pwdBtn.onclick = (e) => {
        e.preventDefault();
        tryAuth();
      };
    }
    if (pwdInput) {
      pwdInput.onkeydown = (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          tryAuth();
        }
      };
      setTimeout(() => pwdInput.focus(), 100);
    }
  }

  let currentMonth = '8';
  let currentWeek = 'ALL';
  let currentDate = 'ALL';
  let activeTab = 'tab-overview';

  let powerlinkActiveChips = new Set();
  let powerlinkActiveSearchTypes = new Set();
  let shoppingActiveChips = new Set();
  let newproductActiveChips = new Set();

  let powerlinkAdGroupDevice = 'ALL';
  let powerlinkTop10Device = 'ALL';
  let powerlinkKwDevice = 'ALL';

  let shoppingAdGroupDevice = 'ALL';
  let shoppingProdDevice = 'ALL';
  let shoppingKwDevice = 'ALL';

  const getDeviceType = (item) => {
    if (!item) return 'PC';
    if (item.Device) return item.Device;
    if (item.d) return item.d;
    const cName = (item.Campaign || '').toUpperCase();
    if (cName.includes('MO') || cName.includes('모바일') || cName.includes('MOBILE')) {
      return 'MO';
    }
    return 'PC';
  };

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
      return `<span class="diff-badge diff-down">▼ -${Math.abs(diffVal).toFixed(1)}%p</span>`;
    } else {
      return `<span class="diff-badge diff-neutral">- 0.0%p</span>`;
    }
  };

  // Standardize Data Items
  const normalizeItem = (item) => {
    if (!item) return {};
    return {
      Month: item.Month || item.m || '',
      Week: item.Week || item.w || '',
      Date: item.Date || item.dt || '',
      Device: item.Device || item.d || '',
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

  // Populate Date Selector Options
  const updateDateOptions = () => {
    const raw = getData();
    const dateSelect = document.getElementById('dateSelect');
    if (!dateSelect) return;

    let availableDates = new Set();
    const sourceList = raw.groups.length > 0 ? raw.groups : raw.keywords;

    sourceList.forEach(item => {
      if (currentMonth !== 'ALL' && String(item.Month) !== String(currentMonth)) return;
      if (currentWeek !== 'ALL' && String(item.Week) !== String(currentWeek)) return;
      if (item.Date) availableDates.add(item.Date);
    });

    const sortedDates = Array.from(availableDates).sort();

    let html = `<option value="ALL" ${currentDate === 'ALL' ? 'selected' : ''}>전체 일자 (All Days)</option>`;
    sortedDates.forEach(d => {
      html += `<option value="${d}" ${currentDate === d ? 'selected' : ''}>${d}</option>`;
    });
    dateSelect.innerHTML = html;
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
      if (currentDate !== 'ALL' && String(item.Date) !== String(currentDate)) return false;
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
      currentDate = 'ALL';
      updateWeekOptions();
      updateDateOptions();
      updateDashboard();
    });
  }

  const weekSelect = document.getElementById('weekSelect');
  if (weekSelect) {
    weekSelect.addEventListener('change', (e) => {
      currentWeek = e.target.value;
      currentDate = 'ALL';
      updateDateOptions();
      updateDashboard();
    });
  }

  const dateSelect = document.getElementById('dateSelect');
  if (dateSelect) {
    dateSelect.addEventListener('change', (e) => {
      currentDate = e.target.value;
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

  // Render Top KPI Summary Cards
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
      allGroups.forEach(w => {
        costSum += w.CostNoVat || 0;
        revSum += w.Revenue || 0;
      });
      const totalRoas = costSum > 0 ? (revSum / costSum) * 100 : 0;

      ovBox.innerHTML = `
        <div class="insight-item positive">
          <h4>📌 1. [${filterText}] 전체 성과 요약</h4>
          <p>총 광고비(VAT제외) <strong>${fmtCurr(costSum)}</strong> 집행, 총 전환매출액 <strong>${fmtCurr(revSum)}</strong> 달성으로 평균 ROAS <strong>${fmtRoas(totalRoas)}</strong>의 견고한 효율을 기록했습니다.</p>
        </div>
        <div class="insight-item info">
          <h4>📈 2. 주차별 성과 요약</h4>
          <p>8월 1주차 프로모션 기획전 특수로 ROAS 1,000% 이상 폭발적 성과를 거두었으며, 2~3주차에도 주차별 1.5~2억원대 안정적 매출을 유지 중입니다.</p>
        </div>
        <div class="insight-item warning">
          <h4>🎯 3. 그룹별 성과 요약</h4>
          <p>자사명 브랜드 그룹(ROAS 1,200%+) 및 카테고리 대표 상품군(레티놀/파우더)이 전체 매출 및 효율 성장의 대부분을 형성하고 있습니다.</p>
        </div>
        <div class="insight-item positive">
          <h4>💡 4. 매출 & ROAS 견인 요약</h4>
          <p>쇼핑검색 대표 상품 <strong>이니스프리 그린티 / 파우더 더블기획</strong> 소재 및 파워링크 <strong>[이니스프리]</strong> 자사명 키워드가 성장의 핵심 모멘텀입니다.</p>
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
          <h4>📌 1. [${filterText}] 파워링크 전체 성과 요약</h4>
          <p>파워링크 광고비 <strong>${fmtCurr(plCost)}</strong> 투입으로 매출액 <strong>${fmtCurr(plRev)}</strong>, ROAS <strong>${fmtRoas(plRoas)}</strong> 달성.</p>
        </div>
        <div class="insight-item info">
          <h4>📈 2. 주차별 성과 요약</h4>
          <p>주차별 광고비 소진 대비 ROAS 400%~520% 수준을 꾸준히 유지하며 검색 유입 고객의 구매 전환율을 방어하고 있습니다.</p>
        </div>
        <div class="insight-item warning">
          <h4>🎯 3. 그룹별 성과 요약 (자사명 vs 제품군)</h4>
          <p>[자사명] 그룹은 ROAS 1,000% 이상으로 압도적이며, [제품군/일반키워드] 그룹은 인지 및 검색 확장 레이어 역할을 수행 중입니다.</p>
        </div>
        <div class="insight-item positive">
          <h4>💡 4. 매출 & ROAS 견인 키워드 요약</h4>
          <p>매출 견인 1위: <strong>[이니스프리]</strong> | ROAS 견인 1위: <strong>[이니스프리 노세범]</strong> (고효율 키워드 입찰가 튜닝 필요).</p>
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
          <h4>📌 1. [${filterText}] 쇼핑검색 전체 성과 요약</h4>
          <p>쇼핑검색 광고비 <strong>${fmtCurr(spCost)}</strong> 투입으로 매출액 <strong>${fmtCurr(spRev)}</strong>, ROAS <strong>${fmtRoas(spRoas)}</strong> 기록.</p>
        </div>
        <div class="insight-item info">
          <h4>🛍️ 2. 상품(소재)별 효율 요약</h4>
          <p>대표 베스트셀러 <strong>이니스프리 그린티 세럼 / 노세범 파우더</strong> 품목이 쇼핑검색 전체 전환매출의 70% 이상을 견인했습니다.</p>
        </div>
      `;
    }

    // 4. Newproduct Insights
    const npBox = document.getElementById('newproductInsightList');
    if (npBox) {
      const npGroups = allGroups.filter(g => g.CampaignType === '신제품검색');
      let npCost = 0, npRev = 0;
      npGroups.forEach(g => { npCost += g.CostNoVat || 0; npRev += g.Revenue || 0; });
      const npRoas = npCost > 0 ? (npRev / npCost) * 100 : 0;

      npBox.innerHTML = `
        <div class="insight-item positive">
          <h4>✨ 1. [${filterText}] 신제품검색 성과 요약</h4>
          <p>신제품검색 광고비 <strong>${fmtCurr(npCost)}</strong> 투입으로 매출액 <strong>${fmtCurr(npRev)}</strong>, ROAS <strong>${fmtRoas(npRoas)}</strong> 달성.</p>
        </div>
      `;
    }
  };

  // Render Weekly Table Below Charts
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
        <td>📌 ${mTitle} 전체</td>
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

    let filtered = plGroups;
    if (powerlinkAdGroupDevice !== 'ALL') {
      filtered = filtered.filter(g => getDeviceType(g) === powerlinkAdGroupDevice);
    }

    const catMap = {};
    filtered.forEach(g => {
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

  // Powerlink AdGroup Device Subtab Listeners
  const plAdgroupDevBtns = document.querySelectorAll('#adgroupDeviceGroup .subtab-btn');
  plAdgroupDevBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      plAdgroupDevBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      powerlinkAdGroupDevice = btn.getAttribute('data-device');
      const plGroups = filterList(getData().groups.filter(g => g.CampaignType === '파워링크'));
      renderPowerlinkAdGroupCats(plGroups);
    });
  });

  // Powerlink SearchType Chips Render
  const renderPowerlinkSearchTypeChips = (plKw) => {
    const chipContainer = document.getElementById('powerlinkSearchTypeChips');
    if (!chipContainer) return;

    const typeSet = new Set();
    plKw.forEach(k => {
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
        const typeVal = btn.getAttribute('data-type');
        if (typeVal === 'ALL') {
          powerlinkActiveSearchTypes.clear();
        } else {
          if (powerlinkActiveSearchTypes.has(typeVal)) powerlinkActiveSearchTypes.delete(typeVal);
          else powerlinkActiveSearchTypes.add(typeVal);
        }
        renderPowerlinkSearchTypeChips(plKw);
        if (updatePowerlinkKwTable) updatePowerlinkKwTable();
      });
    });
  };

  // Powerlink Device Table (PC vs MO)
  const renderPowerlinkDeviceTable = (plGroups) => {
    const tbody = document.querySelector('#tablePowerlinkDevice tbody');
    if (!tbody) return;

    let totalMo = { Imp: 0, Clk: 0, CostNoVat: 0, Conv: 0, Revenue: 0 };
    let totalPc = { Imp: 0, Clk: 0, CostNoVat: 0, Conv: 0, Revenue: 0 };

    plGroups.forEach(item => {
      const dev = getDeviceType(item);
      if (dev === 'MO') {
        totalMo.Imp += item.Imp || 0;
        totalMo.Clk += item.Clk || 0;
        totalMo.CostNoVat += item.CostNoVat || 0;
        totalMo.Conv += item.Conv || 0;
        totalMo.Revenue += item.Revenue || 0;
      } else {
        totalPc.Imp += item.Imp || 0;
        totalPc.Clk += item.Clk || 0;
        totalPc.CostNoVat += item.CostNoVat || 0;
        totalPc.Conv += item.Conv || 0;
        totalPc.Revenue += item.Revenue || 0;
      }
    });

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

    html += plGroups.map(item => {
      const dev = getDeviceType(item);
      const isMo = dev === 'MO';
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

  // Powerlink TOP 10 Keywords Table
  const renderPowerlinkTop10Kw = (plKw) => {
    const tbody = document.querySelector('#tablePowerlinkTop10Kw tbody');
    if (!tbody) return;

    let filtered = plKw;
    if (powerlinkTop10Device !== 'ALL') {
      filtered = filtered.filter(k => getDeviceType(k) === powerlinkTop10Device);
    }

    const combined = {};
    filtered.forEach(k => {
      const dev = getDeviceType(k);
      const kwKey = k.Keyword + '|' + dev;
      if (!combined[kwKey]) {
        combined[kwKey] = { Keyword: k.Keyword, Device: dev, Imp: 0, Clk: 0, CostNoVat: 0, Conv: 0, Revenue: 0 };
      }
      combined[kwKey].Imp += k.Imp || 0;
      combined[kwKey].Clk += k.Clk || 0;
      combined[kwKey].CostNoVat += k.CostNoVat || 0;
      combined[kwKey].Conv += k.Conv || 0;
      combined[kwKey].Revenue += k.Revenue || 0;
    });

    let list = Object.values(combined);

    if (powerlinkTopCategory === 'Revenue') {
      list.sort((a, b) => b.Revenue - a.Revenue);
    } else if (powerlinkTopCategory === 'Roas') {
      list = list.filter(a => a.CostNoVat >= 100000).sort((a, b) => {
        const roasA = a.CostNoVat > 0 ? (a.Revenue / a.CostNoVat) : 0;
        const roasB = b.CostNoVat > 0 ? (b.Revenue / b.CostNoVat) : 0;
        return roasB - roasA;
      });
    } else if (powerlinkTopCategory === 'LowRoas') {
      list = list.filter(a => a.CostNoVat >= 200000).sort((a, b) => {
        const roasA = a.CostNoVat > 0 ? (a.Revenue / a.CostNoVat) : 0;
        const roasB = b.CostNoVat > 0 ? (b.Revenue / b.CostNoVat) : 0;
        return roasA - roasB;
      });
    }

    const top10 = list.slice(0, 10);

    if (tbody) {
      const html = top10.map((k, idx) => {
        const ctr = k.Imp > 0 ? (k.Clk / k.Imp) * 100 : 0;
        const roas = k.CostNoVat > 0 ? (k.Revenue / k.CostNoVat) * 100 : 0;
        const aov = k.Conv > 0 ? k.Revenue / k.Conv : 0;
        const cpc = k.Clk > 0 ? k.CostNoVat / k.Clk : 0;

        return `
          <tr>
            <td><strong>#${idx + 1}</strong></td>
            <td><strong>${k.Keyword}</strong></td>
            <td><span class="kpi-badge">${k.Device}</span></td>
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

      tbody.innerHTML = html || `<tr><td colspan="12" style="text-align:center;">데이터 없음</td></tr>`;
    }
  };

  // Top 10 Subtab Event Listeners
  const top10CategoryBtns = document.querySelectorAll('#kwTop10Group .subtab-btn');
  top10CategoryBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      top10CategoryBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      powerlinkTopCategory = btn.getAttribute('data-cat');
      const plKw = filterList(getData().keywords.filter(k => k.CampaignType === '파워링크'));
      renderPowerlinkTop10Kw(plKw);
    });
  });

  const top10DevBtns = document.querySelectorAll('#kwTop10DeviceGroup .subtab-btn');
  top10DevBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      top10DevBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      powerlinkTop10Device = btn.getAttribute('data-device');
      const plKw = filterList(getData().keywords.filter(k => k.CampaignType === '파워링크'));
      renderPowerlinkTop10Kw(plKw);
    });
  });

  // Powerlink Kw Growth Split Table
  const renderPowerlinkKwGrowthSplit = (rawData) => {
    const tbodyUp = document.querySelector('#tablePowerlinkKwGrowthUp tbody');
    const tbodyDown = document.querySelector('#tablePowerlinkKwGrowthDown tbody');
    if (!tbodyUp || !tbodyDown) return;

    const curMonthKw = filterList(rawData.keywords.filter(k => k.CampaignType === '파워링크'));
    const curKwMap = {};
    curMonthKw.forEach(k => {
      const dev = getDeviceType(k);
      const kwKey = k.Keyword + '|' + dev;
      if (!curKwMap[kwKey]) {
        curKwMap[kwKey] = { Keyword: k.Keyword, Device: dev, CostNoVat: 0, Revenue: 0 };
      }
      curKwMap[kwKey].CostNoVat += k.CostNoVat || 0;
      curKwMap[kwKey].Revenue += k.Revenue || 0;
    });

    const prevKwMap = {};
    if (powerlinkGrowthCategory === 'wow') {
      const curMonthWeeks = Array.from(new Set(curMonthKw.map(g => g.Week))).sort();
      const latestWeek = curMonthWeeks[curMonthWeeks.length - 1];
      const allWeeks = Array.from(new Set(rawData.keywords.filter(k => k.CampaignType === '파워링크').map(g => g.Week))).sort();
      const latestIdx = allWeeks.indexOf(latestWeek);
      const prevWeek = latestIdx > 0 ? allWeeks[latestIdx - 1] : null;

      if (prevWeek) {
        rawData.keywords.filter(k => k.CampaignType === '파워링크' && k.Week === prevWeek).forEach(k => {
          const dev = getDeviceType(k);
          const kwKey = k.Keyword + '|' + dev;
          if (!prevKwMap[kwKey]) {
            prevKwMap[kwKey] = { CostNoVat: 0, Revenue: 0 };
          }
          prevKwMap[kwKey].CostNoVat += k.CostNoVat || 0;
          prevKwMap[kwKey].Revenue += k.Revenue || 0;
        });
      }
    } else {
      const curM = currentMonth !== 'ALL' ? parseInt(currentMonth) : 8;
      const prevM = curM > 1 ? curM - 1 : 12;

      rawData.keywords.filter(k => k.CampaignType === '파워링크' && String(k.Month) === String(prevM)).forEach(k => {
        const dev = getDeviceType(k);
        const kwKey = k.Keyword + '|' + dev;
        if (!prevKwMap[kwKey]) {
          prevKwMap[kwKey] = { CostNoVat: 0, Revenue: 0 };
        }
        prevKwMap[kwKey].CostNoVat += k.CostNoVat || 0;
        prevKwMap[kwKey].Revenue += k.Revenue || 0;
      });
    }

    const growthList = [];
    Object.keys(curKwMap).forEach(kwKey => {
      const cur = curKwMap[kwKey];
      const prev = prevKwMap[kwKey];
      if (cur.CostNoVat >= 50000 || (prev && prev.CostNoVat >= 50000)) {
        const curRoas = cur.CostNoVat > 0 ? (cur.Revenue / cur.CostNoVat) * 100 : 0;
        const prevRoas = prev && prev.CostNoVat > 0 ? (prev.Revenue / prev.CostNoVat) * 100 : 0;
        const diff = curRoas - prevRoas;

        growthList.push({
          Keyword: cur.Keyword,
          Device: cur.Device,
          CurRoas: curRoas,
          PrevRoas: prevRoas,
          Diff: diff,
          CostNoVat: cur.CostNoVat,
          Revenue: cur.Revenue
        });
      }
    });

    const upList = growthList.filter(item => item.Diff >= 0).sort((a, b) => b.Diff - a.Diff).slice(0, 10);
    const htmlUp = upList.map((item, idx) => `
      <tr>
        <td><strong>#${idx + 1}</strong></td>
        <td><strong>${item.Keyword}</strong></td>
        <td><span class="kpi-badge">${item.Device}</span></td>
        <td class="number-col">${fmtRoas(item.CurRoas)}</td>
        <td class="number-col">${fmtRoas(item.PrevRoas)}</td>
        <td class="number-col">${getDiffBadge(item.Diff)}</td>
        <td class="number-col">${fmtCurr(item.CostNoVat)}</td>
        <td class="number-col">${fmtCurr(item.Revenue)}</td>
      </tr>
    `).join('');
    tbodyUp.innerHTML = htmlUp || `<tr><td colspan="8" style="text-align:center;">데이터 없음</td></tr>`;

    const downList = growthList.filter(item => item.Diff < 0).sort((a, b) => a.Diff - b.Diff).slice(0, 10);
    const htmlDown = downList.map((item, idx) => `
      <tr>
        <td><strong>#${idx + 1}</strong></td>
        <td><strong>${item.Keyword}</strong></td>
        <td><span class="kpi-badge">${item.Device}</span></td>
        <td class="number-col">${fmtRoas(item.CurRoas)}</td>
        <td class="number-col">${fmtRoas(item.PrevRoas)}</td>
        <td class="number-col">${getDiffBadge(item.Diff)}</td>
        <td class="number-col">${fmtCurr(item.CostNoVat)}</td>
        <td class="number-col">${fmtCurr(item.Revenue)}</td>
      </tr>
    `).join('');
    tbodyDown.innerHTML = htmlDown || `<tr><td colspan="8" style="text-align:center;">데이터 없음</td></tr>`;
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

  // Shopping Tab: AdGroup Categories Performance Table
  const renderShoppingAdGroupCats = (shoppingGroups) => {
    const tbody = document.querySelector('#tableShoppingAdGroupCat tbody');
    const chipContainer = document.getElementById('shoppingAdGroupChips');

    let filtered = shoppingGroups;
    if (shoppingAdGroupDevice !== 'ALL') {
      filtered = filtered.filter(g => getDeviceType(g) === shoppingAdGroupDevice);
    }

    const catMap = {};
    filtered.forEach(g => {
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

  const spAdgroupDevBtns = document.querySelectorAll('#shoppingAdGroupDeviceGroup .subtab-btn');
  spAdgroupDevBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      spAdgroupDevBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      shoppingAdGroupDevice = btn.getAttribute('data-device');
      const spGroups = filterList(getData().groups.filter(g => g.CampaignType === '쇼핑검색'));
      renderShoppingAdGroupCats(spGroups);
    });
  });

  // NewProduct Tab: AdGroup Categories Performance Table
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

  // Helper function for ROAS Line Badge Canvas Rendering
  const drawRoundedRect = (ctx, x, y, width, height, radius, fillStyle) => {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
    ctx.fillStyle = fillStyle;
    ctx.fill();
  };

  const roasLabelPlugin = {
    id: 'roasLabelPlugin',
    afterDatasetsDraw(chart) {
      const { ctx } = chart;
      chart.data.datasets.forEach((dataset, datasetIndex) => {
        if (dataset.label && dataset.label.includes('ROAS')) {
          const meta = chart.getDatasetMeta(datasetIndex);
          if (!meta.hidden) {
            meta.data.forEach((element, index) => {
              const val = dataset.data[index];
              if (val !== undefined && val !== null) {
                const text = val.toFixed(1) + '%';
                ctx.save();
                ctx.font = 'bold 11px system-ui, -apple-system, sans-serif';
                const textWidth = ctx.measureText(text).width;
                const paddingX = 6;
                const paddingY = 3;
                const rectWidth = textWidth + paddingX * 2;
                const rectHeight = 16 + paddingY;
                const rectX = element.x - rectWidth / 2;
                const rectY = element.y - rectHeight - 6;

                ctx.shadowColor = 'rgba(0, 0, 0, 0.15)';
                ctx.shadowBlur = 4;
                ctx.shadowOffsetY = 2;

                const bgColor = dataset.borderColor || '#d97706';
                drawRoundedRect(ctx, rectX, rectY, rectWidth, rectHeight, 4, bgColor);

                ctx.shadowColor = 'transparent';
                ctx.fillStyle = '#ffffff';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(text, element.x, rectY + rectHeight / 2);
                ctx.restore();
              }
            });
          }
        }
      });
    }
  };

  // Render Charts Function
  const renderCharts = (monthOnlyGroups) => {
    Chart.defaults.font.family = "'Pretendard', 'Apple SD Gothic Neo', system-ui, sans-serif";
    Chart.defaults.color = '#64748b';

    const weeks = Array.from(new Set(monthOnlyGroups.map(g => g.Week))).sort();

    const getWeeklyAgg = (filtered) => {
      const map = {};
      weeks.forEach(w => { map[w] = { CostNoVat: 0, Revenue: 0 }; });
      filtered.forEach(g => {
        if (map[g.Week]) {
          map[g.Week].CostNoVat += g.CostNoVat || 0;
          map[g.Week].Revenue += g.Revenue || 0;
        }
      });
      return weeks.map(w => map[w]);
    };

    // 1. Overview Weekly Chart
    const ovData = getWeeklyAgg(monthOnlyGroups);
    const ovCtx = document.getElementById('chartWeeklyOverview');
    if (ovCtx) {
      if (charts.overview) charts.overview.destroy();
      charts.overview = new Chart(ovCtx, {
        type: 'bar',
        data: {
          labels: weeks,
          datasets: [
            { label: '광고비 (원)', data: ovData.map(d => d.CostNoVat), backgroundColor: 'rgba(217, 119, 6, 0.75)', borderRadius: 6, yAxisID: 'y' },
            { label: '전환매출액 (원)', data: ovData.map(d => d.Revenue), backgroundColor: 'rgba(5, 150, 105, 0.75)', borderRadius: 6, yAxisID: 'y' },
            { label: 'ROAS (%)', data: ovData.map(d => d.CostNoVat > 0 ? (d.Revenue / d.CostNoVat) * 100 : 0), type: 'line', borderColor: '#d97706', backgroundColor: '#d97706', borderWidth: 3, pointRadius: 5, yAxisID: 'y1' }
          ]
        },
        plugins: [roasLabelPlugin],
        options: {
          responsive: true,
          maintainAspectRatio: false,
          scales: {
            y: { beginAtZero: true, grid: { color: '#f1f5f9' } },
            y1: { position: 'right', beginAtZero: true, grid: { drawOnChartArea: false }, ticks: { callback: v => v + '%' } }
          }
        }
      });
    }

    // 2. Powerlink Weekly Chart
    const plData = getWeeklyAgg(monthOnlyGroups.filter(g => g.CampaignType === '파워링크'));
    const plCtx = document.getElementById('chartPowerlinkWeekly');
    if (plCtx) {
      if (charts.powerlink) charts.powerlink.destroy();
      charts.powerlink = new Chart(plCtx, {
        type: 'bar',
        data: {
          labels: weeks,
          datasets: [
            { label: '전환매출액 (원)', data: plData.map(d => d.Revenue), backgroundColor: 'rgba(5, 150, 105, 0.75)', borderRadius: 6, yAxisID: 'y' },
            { label: 'ROAS (%)', data: plData.map(d => d.CostNoVat > 0 ? (d.Revenue / d.CostNoVat) * 100 : 0), type: 'line', borderColor: '#059669', backgroundColor: '#059669', borderWidth: 3, pointRadius: 5, yAxisID: 'y1' }
          ]
        },
        plugins: [roasLabelPlugin],
        options: {
          responsive: true,
          maintainAspectRatio: false,
          scales: {
            y: { beginAtZero: true, grid: { color: '#f1f5f9' } },
            y1: { position: 'right', beginAtZero: true, grid: { drawOnChartArea: false }, ticks: { callback: v => v + '%' } }
          }
        }
      });
    }

    // 3. Shopping Weekly Chart
    const spData = getWeeklyAgg(monthOnlyGroups.filter(g => g.CampaignType === '쇼핑검색'));
    const spCtx = document.getElementById('chartShoppingWeekly');
    if (spCtx) {
      if (charts.shopping) charts.shopping.destroy();
      charts.shopping = new Chart(spCtx, {
        type: 'bar',
        data: {
          labels: weeks,
          datasets: [
            { label: '광고비 (원)', data: spData.map(d => d.CostNoVat), backgroundColor: 'rgba(217, 119, 6, 0.75)', borderRadius: 6, yAxisID: 'y' },
            { label: '전환매출액 (원)', data: spData.map(d => d.Revenue), backgroundColor: 'rgba(5, 150, 105, 0.75)', borderRadius: 6, yAxisID: 'y' },
            { label: 'ROAS (%)', data: spData.map(d => d.CostNoVat > 0 ? (d.Revenue / d.CostNoVat) * 100 : 0), type: 'line', borderColor: '#d97706', backgroundColor: '#d97706', borderWidth: 3, pointRadius: 5, yAxisID: 'y1' }
          ]
        },
        plugins: [roasLabelPlugin],
        options: {
          responsive: true,
          maintainAspectRatio: false,
          scales: {
            y: { beginAtZero: true, grid: { color: '#f1f5f9' } },
            y1: { position: 'right', beginAtZero: true, grid: { drawOnChartArea: false }, ticks: { callback: v => v + '%' } }
          }
        }
      });
    }

    // 4. Newproduct Weekly Chart
    const npData = getWeeklyAgg(monthOnlyGroups.filter(g => g.CampaignType === '신제품검색'));
    const npCtx = document.getElementById('chartNewproductWeekly');
    if (npCtx) {
      if (charts.newproduct) charts.newproduct.destroy();
      charts.newproduct = new Chart(npCtx, {
        type: 'bar',
        data: {
          labels: weeks,
          datasets: [
            { label: '광고비 (원)', data: npData.map(d => d.CostNoVat), backgroundColor: 'rgba(217, 119, 6, 0.75)', borderRadius: 6, yAxisID: 'y' },
            { label: '전환매출액 (원)', data: npData.map(d => d.Revenue), backgroundColor: 'rgba(5, 150, 105, 0.75)', borderRadius: 6, yAxisID: 'y' },
            { label: 'ROAS (%)', data: npData.map(d => d.CostNoVat > 0 ? (d.Revenue / d.CostNoVat) * 100 : 0), type: 'line', borderColor: '#d97706', backgroundColor: '#d97706', borderWidth: 3, pointRadius: 5, yAxisID: 'y1' }
          ]
        },
        plugins: [roasLabelPlugin],
        options: {
          responsive: true,
          maintainAspectRatio: false,
          scales: {
            y: { beginAtZero: true, grid: { color: '#f1f5f9' } },
            y1: { position: 'right', beginAtZero: true, grid: { drawOnChartArea: false }, ticks: { callback: v => v + '%' } }
          }
        }
      });
    }
  };

  // Helper Table Setup Function
  const setupTable = ({ tableId, searchId, countId, pageInfoId, prevBtnId, nextBtnId, getRawData, renderRow, defaultSort = 'Revenue' }) => {
    let currentPage = 1;
    const pageSize = 15;
    let sortCol = defaultSort;
    let sortDir = 'desc';

    const searchInput = document.getElementById(searchId);
    const prevBtn = document.getElementById(prevBtnId);
    const nextBtn = document.getElementById(nextBtnId);
    const pageInfo = document.getElementById(pageInfoId);
    const countInfo = document.getElementById(countId);
    const tbody = document.querySelector(`#${tableId} tbody`);
    const thList = document.querySelectorAll(`#${tableId} th.sortable`);

    const updateTable = () => {
      let list = getRawData();
      const q = searchInput ? searchInput.value.trim().toLowerCase() : '';

      if (q) {
        list = list.filter(item => {
          return Object.values(item).some(val => String(val).toLowerCase().includes(q));
        });
      }

      list.sort((a, b) => {
        let va = a[sortCol];
        let vb = b[sortCol];

        if (sortCol === 'Ctr') {
          va = a.Imp > 0 ? (a.Clk / a.Imp) : 0;
          vb = b.Imp > 0 ? (b.Clk / b.Imp) : 0;
        } else if (sortCol === 'Roas') {
          va = a.CostNoVat > 0 ? (a.Revenue / a.CostNoVat) : 0;
          vb = b.CostNoVat > 0 ? (b.Revenue / b.CostNoVat) : 0;
        } else if (sortCol === 'Aov') {
          va = a.Conv > 0 ? (a.Revenue / a.Conv) : 0;
          vb = b.Conv > 0 ? (b.Revenue / b.Conv) : 0;
        } else if (sortCol === 'Cpc') {
          va = a.Clk > 0 ? (a.CostNoVat / a.Clk) : 0;
          vb = b.Clk > 0 ? (b.CostNoVat / b.Clk) : 0;
        }

        if (typeof va === 'string') {
          return sortDir === 'asc' ? va.localeCompare(vb) : vb.localeCompare(va);
        }
        return sortDir === 'asc' ? (va - vb) : (vb - va);
      });

      const totalCount = list.length;
      const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
      if (currentPage > totalPages) currentPage = totalPages;

      if (countInfo) countInfo.innerText = `총 ${totalCount.toLocaleString()}건`;

      const start = (currentPage - 1) * pageSize;
      const pageData = list.slice(start, start + pageSize);

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

    // 1-2. Daily Performance Tables at Bottom of Each Tab
    renderDailyTable('tableDailyOverview', filteredGroups);
    renderDailyTable('tablePowerlinkDaily', filteredGroups.filter(g => g.CampaignType === '파워링크'));
    renderDailyTable('tableShoppingDaily', filteredGroups.filter(g => g.CampaignType === '쇼핑검색'));
    renderDailyTable('tableNewproductDaily', filteredGroups.filter(g => g.CampaignType === '신제품검색'));

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

    // 4. Powerlink PC / MO Campaign Table
    renderPowerlinkDeviceTable(filteredGroups.filter(g => g.CampaignType === '파워링크'));

    // 5. Powerlink TOP 10 Keywords & Growth Keywords Split
    renderPowerlinkTop10Kw(plKw);
    renderPowerlinkKwGrowthSplit(getData());

    // 6. Bottom Powerlink Keywords Table
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
        if (powerlinkKwDevice !== 'ALL') {
          plList = plList.filter(k => getDeviceType(k) === powerlinkKwDevice);
        }
        const combined = {};
        plList.forEach(k => {
          const dev = getDeviceType(k);
          const kwKey = k.Keyword + '|' + dev;
          if (!combined[kwKey]) {
            combined[kwKey] = { Keyword: k.Keyword, Device: dev, SearchType: k.SearchType || '-', Imp: 0, Clk: 0, CostNoVat: 0, Conv: 0, Revenue: 0 };
          }
          combined[kwKey].Imp += k.Imp || 0;
          combined[kwKey].Clk += k.Clk || 0;
          combined[kwKey].CostNoVat += k.CostNoVat || 0;
          combined[kwKey].Conv += k.Conv || 0;
          combined[kwKey].Revenue += k.Revenue || 0;
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
            <td><span class="kpi-badge">${k.Device || '-'}</span></td>
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

    const kwDevBtns = document.querySelectorAll('#powerlinkKwDeviceGroup .subtab-btn');
    kwDevBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        kwDevBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        powerlinkKwDevice = btn.getAttribute('data-device');
        updatePowerlinkKwTable();
      });
    });

    // 7. Shopping AdGroup Categories
    const spGroups = filteredGroups.filter(g => g.CampaignType === '쇼핑검색');
    renderShoppingAdGroupCats(spGroups);

    // 8. Shopping Products Table
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
        if (shoppingProdDevice !== 'ALL') list = list.filter(p => getDeviceType(p) === shoppingProdDevice);
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
            <td><span class="kpi-badge">${getDeviceType(p)}</span></td>
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

    const spProdDevBtns = document.querySelectorAll('#shoppingProdDeviceGroup .subtab-btn');
    spProdDevBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        spProdDevBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        shoppingProdDevice = btn.getAttribute('data-device');
        updateShoppingProdTable();
      });
    });

    // 9. Shopping Keywords Table
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
        if (shoppingKwDevice !== 'ALL') list = list.filter(k => getDeviceType(k) === shoppingKwDevice);
        const combined = {};
        list.forEach(k => {
          const dev = getDeviceType(k);
          const kwKey = k.Keyword + '|' + dev;
          if (!combined[kwKey]) {
            combined[kwKey] = { Keyword: k.Keyword, Device: dev, AdGroupCat: k.AdGroupCat, Imp: 0, Clk: 0, CostNoVat: 0, Conv: 0, Revenue: 0 };
          }
          combined[kwKey].Imp += k.Imp || 0;
          combined[kwKey].Clk += k.Clk || 0;
          combined[kwKey].CostNoVat += k.CostNoVat || 0;
          combined[kwKey].Conv += k.Conv || 0;
          combined[kwKey].Revenue += k.Revenue || 0;
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
            <td><span class="kpi-badge">${k.Device || '-'}</span></td>
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

    const spKwDevBtns = document.querySelectorAll('#shoppingKwDeviceGroup .subtab-btn');
    spKwDevBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        spKwDevBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        shoppingKwDevice = btn.getAttribute('data-device');
        updateShoppingKwTable();
      });
    });

    // 10. NewProduct Tab
    const npGroups = filteredGroups.filter(g => g.CampaignType === '신제품검색');
    renderNewproductAdGroupCats(npGroups);

    updateNewproductKwTable = setupTable({
      tableId: 'tableNewproductKw',
      searchId: 'searchNewproductKw',
      countId: 'countNewproductKw',
      pageInfoId: 'pageInfoNewproductKw',
      prevBtnId: 'prevNewproductKw',
      nextBtnId: 'nextNewproductKw',
      getRawData: () => {
        let list = filteredKw.filter(k => k.CampaignType === '신제품검색');
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
    renderCharts(monthOnlyGroups);
    initTables(monthOnlyGroups, filteredGroups, filteredKw, filteredProd);
  };

  // Helper: Daily Performance Table Renderer
  const renderDailyTable = (tableId, groups) => {
    const tbody = document.querySelector(`#${tableId} tbody`);
    if (!tbody) return;

    const dateMap = {};
    groups.forEach(g => {
      const d = g.Date || '기타';
      if (!dateMap[d]) {
        dateMap[d] = { Date: d, Imp: 0, Clk: 0, CostNoVat: 0, Conv: 0, Revenue: 0 };
      }
      dateMap[d].Imp += g.Imp || 0;
      dateMap[d].Clk += g.Clk || 0;
      dateMap[d].CostNoVat += g.CostNoVat || 0;
      dateMap[d].Conv += g.Conv || 0;
      dateMap[d].Revenue += g.Revenue || 0;
    });

    const dateList = Object.values(dateMap).sort((a, b) => a.Date.localeCompare(b.Date));

    if (dateList.length === 0) {
      tbody.innerHTML = `<tr><td colspan="10" style="text-align:center; padding:24px; color:var(--text-muted);">조회된 데이터가 없습니다.</td></tr>`;
      return;
    }

    const html = dateList.map(item => {
      const ctr = item.Imp > 0 ? (item.Clk / item.Imp) * 100 : 0;
      const roas = item.CostNoVat > 0 ? (item.Revenue / item.CostNoVat) * 100 : 0;
      const aov = item.Conv > 0 ? item.Revenue / item.Conv : 0;
      const cpc = item.Clk > 0 ? item.CostNoVat / item.Clk : 0;

      return `
        <tr>
          <td><strong>📅 ${item.Date}</strong></td>
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

  // Initial Execution
  if (checkAuth()) {
    updateWeekOptions();
    updateDateOptions();
    updateDashboard();
  }
});