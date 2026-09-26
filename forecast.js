/* ============================================
   TINDA GO - Level 1 Offline Demand Forecast (JS port)
   ============================================
   Exact 1:1 port of the Android ForecastEngine.kt
   (git/app/TindaGo_APP/.../data/ml/ForecastEngine.kt).

   Level 1 — Offline Statistical Demand Forecast.
   No network / no TFLite / pure JS — learns avgDailySales from the last
   7 days of sales data (Algorithm 12, 12_Level1_Offline_ML_Demand_Forecast.md).

   The engine is framework-agnostic: it consumes a flat list of sale records
   shaped like the mobile SpecificSale: { date: 'yyyy-MM-dd', productName: string,
   quantity: number }. See ForecastEngine.buildAllSalesFromWeb(state) for the
   adapter that normalizes TindaGo web's state.sales + state.history[].archivedSales.

   Usage (from app.js or anywhere after this file loads):
     var forecasts = window.ForecastEngine.forecastAll(products, allSales, todayStr());
     var r = window.ForecastEngine.forecastForProduct(product, allSales, todayStr());
 */
;(function() {
  'use strict';

  var CONF = {
    INSUFFICIENT: 'INSUFFICIENT',
    LOW: 'LOW',
    MEDIUM: 'MEDIUM',
    HIGH: 'HIGH'
  };

  var WINDOW_DAYS    = 7;
  var LEAD_TIME_DAYS = 7;
  var EMA_ALPHA      = 0.5;
  var MIN_AVG_THRESHOLD = 0.15;

  // ─── Date helpers (yyyy-MM-dd, local time — matches web todayStr()) ───
  function pad(n) { return (n < 10 ? '0' : '') + n; }

  function fmtDate(d) {
    return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  }

  function parseDate(str) {
    // Accept 'yyyy-MM-dd' (or full ISO 'yyyy-MM-ddTHH:mm:ss...' — take date part).
    var s = String(str || '');
    var m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (!m) return null;
    // Construct in local time to avoid UTC date-shift (matches Kotlin Calendar/local TZ).
    return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  }


  // ─── Core engine (1:1 with ForecastEngine.kt) ───

  /**
   * Build the 7 daily-history buckets (list of quantities) and the matching
   * list of date strings, ending at todayStr (inclusive), for a single product.
   * Sales are matched by productName with a case-insensitive substring check
   * (the web analog of Kotlin: description.contains(product.name, ignoreCase=true)).
   */
  function buildDailyHistory(product, allSales, todayStr, windowDays) {
    if (windowDays == null) windowDays = WINDOW_DAYS;
    var todayDate = parseDate(todayStr) || new Date();
    // Walk back (windowDays - 1) days to build the window start.
    var start = new Date(todayDate);
    start.setDate(start.getDate() - (windowDays - 1));

    var dates = [];
    var cur = new Date(start);
    for (var i = 0; i < windowDays; i++) {
      dates.push(fmtDate(cur));
      cur.setDate(cur.getDate() + 1);
    }

    var name = (product && product.name) ? product.name : '';
    var lcName = name.toLowerCase();

    var history = dates.map(function(date) {
      var sum = 0;
      for (var j = 0; j < allSales.length; j++) {
        var s = allSales[j];
        if (!s) continue;
        if (s.date !== date) continue;
        var pn = s.productName;
        if (pn == null) continue;
        if (String(pn).toLowerCase().indexOf(lcName) === -1) continue;
        sum += (typeof s.quantity === 'number' && isFinite(s.quantity)) ? s.quantity : 0;
      }
      return sum;
    });

    return { history: history, dates: dates };
  }

  // EMA with alpha — 1:1 with Kotlin's private fun ema.
  function ema(history, alpha) {
    if (!history || history.length === 0) return 0;
    var e = history[0];
    for (var i = 1; i < history.length; i++) {
      e = alpha * history[i] + (1 - alpha) * e;
    }
    return e;
  }

  // Linear-regression next-day trend — 1:1 with Kotlin's trendNextDay.
  function trendNextDay(history, fallback) {
    if (!history || history.length < 3) return fallback;
    var n = history.length;
    var sx = 0, sy = 0, sxy = 0, sx2 = 0;
    for (var i = 0; i < n; i++) {
      var x = i, y = history[i];
      sx += x; sy += y; sxy += x * y; sx2 += x * x;
    }
    var denom = n * sx2 - sx * sx;
    if (denom === 0) return fallback;
    var slope = (n * sxy - sx * sy) / denom;
    var intercept = (sy - slope * sx) / n;
    var next = intercept + slope * n;
    return next > 0 ? next : 0;
  }

  /**
   * Full forecast for one product — 1:1 with ForecastEngine.kt.
   */
  function forecastForProduct(product, allSales, todayStr, windowDays) {
    if (windowDays == null) windowDays = WINDOW_DAYS;
    var bh = buildDailyHistory(product, allSales, todayStr, windowDays);
    var history = bh.history;
    var dates = bh.dates;

    var totalSold = 0;
    var activeDays = 0;
    for (var i = 0; i < history.length; i++) {
      totalSold += history[i];
      if (history[i] > 0) activeDays++;
    }

    var sma = history.length === 0 ? 0 : totalSold / windowDays;
    var emaDaily = ema(history, EMA_ALPHA);
    var trendDaily = trendNextDay(history, sma);
    var avgDaily = sma;

    var stock = (product && typeof product.quantity === 'number' && isFinite(product.quantity))
      ? product.quantity : 0;

    var predictedDays = null;
    if (avgDaily < MIN_AVG_THRESHOLD) {
      predictedDays = null;
    } else if (stock <= 0) {
      predictedDays = 0;
    } else {
      predictedDays = Math.ceil(stock / avgDaily);
    }

    var suggested = 0;
    if (avgDaily >= MIN_AVG_THRESHOLD) {
      suggested = Math.max(0, Math.ceil(avgDaily * LEAD_TIME_DAYS - stock));
    }

    var confidence;
    if (totalSold === 0) confidence = CONF.INSUFFICIENT;
    else if (activeDays <= 1) confidence = CONF.LOW;
    else if (activeDays <= 3) confidence = CONF.MEDIUM;
    else confidence = CONF.HIGH;

    return {
      productId: product ? product.id : null,
      productName: product ? product.name : '',
      currentStock: stock,
      avgDaily: avgDaily,
      emaDaily: emaDaily,
      trendDaily: trendDaily,
      predictedDaysUntilOut: predictedDays,
      suggestedRestockQty: suggested,
      confidence: confidence,
      dailyHistory: history,
      dailyDates: dates,
      totalSold: totalSold,
      activeDays: activeDays,
      forecastMethod: 'Statistical ML (7-day Moving Average)'
    };
  }

  /**
   * Forecast every product — returns a map keyed by product.id.
   * 1:1 with ForecastEngine.forecastAll.
   */
  function forecastAll(products, allSales, todayStr) {
    var map = {};
    for (var i = 0; i < products.length; i++) {
      var p = products[i];
      map[p.id] = forecastForProduct(p, allSales, todayStr, WINDOW_DAYS);
    }
    return map;
  }


  /**
   * Urgent restocks — 1:1 with ForecastEngine.urgentRestocks.
   */
  function urgentRestocks(products, allSales, todayStr, thresholdDays, limit) {
    if (thresholdDays == null) thresholdDays = 7;
    if (limit == null) limit = 5;
    var list = [];
    for (var i = 0; i < products.length; i++) {
      var p = products[i];
      var r = forecastForProduct(p, allSales, todayStr, WINDOW_DAYS);
      list.push({ product: p, result: r });
    }
    list = list.filter(function(item) {
      return item.result.confidence !== CONF.INSUFFICIENT &&
             item.result.predictedDaysUntilOut != null &&
             item.result.predictedDaysUntilOut <= thresholdDays;
    });
    list.sort(function(a, b) {
      return a.result.predictedDaysUntilOut - b.result.predictedDaysUntilOut;
    });
    return list.slice(0, limit);
  }

  /**
   * Accuracy — 1:1 with ForecastEngine.accuracy.
   */
  function accuracy(predicted, actual) {
    if (actual === 0) return 0;
    return Math.max(0, Math.min(1, 1 - Math.abs(predicted - actual) / Math.abs(actual)));
  }

  // ─── Web data adapter ───
  // The web app stores per-line sales in state.sales and archived past days in
  // state.history[].archivedSales. Normalize both into the flat sale list the
  // engine consumes: { date, productName, quantity }.
  function buildAllSalesFromWeb(state) {
    var out = [];
    if (!state) return out;
    var i, s;

    if (Array.isArray(state.sales)) {
      for (i = 0; i < state.sales.length; i++) {
        s = state.sales[i];
        if (!s) continue;
        out.push({
          date: s.date || (s.createdAt ? String(s.createdAt).slice(0, 10) : ''),
          productName: s.productName != null ? s.productName : (s.description || ''),
          quantity: (typeof s.quantity === 'number' && isFinite(s.quantity)) ? s.quantity : 1
        });
      }
    }

    if (Array.isArray(state.history)) {
      for (i = 0; i < state.history.length; i++) {
        var h = state.history[i];
        var arch = h && h.archivedSales;
        if (!Array.isArray(arch)) continue;
        var dateForArch = h.date || '';
        for (var j = 0; j < arch.length; j++) {
          s = arch[j];
          if (!s) continue;
          out.push({
            date: s.date || dateForArch || (s.createdAt ? String(s.createdAt).slice(0, 10) : ''),
            productName: s.productName != null ? s.productName : (s.description || ''),
            quantity: (typeof s.quantity === 'number' && isFinite(s.quantity)) ? s.quantity : 1
          });
        }
      }
    }

    return out;
  }

  // ─── Public API ───
  window.ForecastEngine = {
    CONF: CONF,
    WINDOW_DAYS: WINDOW_DAYS,
    LEAD_TIME_DAYS: LEAD_TIME_DAYS,
    EMA_ALPHA: EMA_ALPHA,
    MIN_AVG_THRESHOLD: MIN_AVG_THRESHOLD,
    buildDailyHistory: buildDailyHistory,
    forecastForProduct: forecastForProduct,
    forecastAll: forecastAll,
    urgentRestocks: urgentRestocks,
    accuracy: accuracy,
    buildAllSalesFromWeb: buildAllSalesFromWeb
  };
})();

