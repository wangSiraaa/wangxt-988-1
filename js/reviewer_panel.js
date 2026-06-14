/* global window, Store, Util, State, UI, Timeline, App, ServicePanel */
(function (global) {

  function runSafely(fn) {
    try { fn(); }
    catch (e) { UI.toast(e.isBiz ? e.message : ('错误：' + e.message), 'error', 4000); }
  }

  const ReviewerPanel = {

    dashboard() {
      const me = Store.currentRole();
      const all = Store.orders();
      const todo = all.filter(function (o) { return o.status === 'review'; });
      const finished = all.filter(function (o) { return o.reviewStatus === 'approved'; });
      const rejected = all.filter(function (o) { return o.reviewStatus === 'rejected'; });
      const needInvoice = all.filter(function (o) {
        const inv = (o.invoices && o.invoices.length) || 0;
        return (o.status === 'done' || o.deposit > 0) && inv === 0;
      });
      const totalAmount = all.reduce(function (s, o) { return s + (o.pricing.total || 0); }, 0);
      const totalDeposit = all.reduce(function (s, o) { return s + Number(o.deposit || 0); }, 0);
      const totalInvoice = all.reduce(function (s, o) {
        return s + (o.invoices || []).reduce(function (t, i) { return t + Number(i.amount || 0); }, 0);
      }, 0);
      return `
        <div class="page-header">
          <div><h2>财务工作台 · 概览</h2><div class="sub">${me.name}（${me.title}）</div></div>
        </div>
        <div class="order-summary-grid">
          <div class="stat-card orange"><div class="num">${todo.length}</div><div class="label">超预估复核待办</div></div>
          <div class="stat-card green"><div class="num">${finished.length}</div><div class="label">复核通过</div></div>
          <div class="stat-card"><div class="num">${needInvoice.length}</div><div class="label">待开票</div></div>
          <div class="stat-card"><div class="num">${Util.fmtMoney(totalDeposit)}</div><div class="label">累计收款</div></div>
        </div>
        <div class="card">
          <div class="card-title">⚠️ 超预估复核（重点）</div>
          ${todo.length ? ServicePanel.orderListView(todo, true) : UI.emptyState('暂无超预估复核工作，喝杯茶 ☕')}
        </div>
        <div class="card">
          <div class="card-title">💰 财务数据概览</div>
          <div class="kpi-row">
            <div class="kpi-item"><span class="kpi-label">累计报价总额</span><span class="kpi-value">${Util.fmtMoney(totalAmount)}</span></div>
            <div class="kpi-item"><span class="kpi-label">累计收款</span><span class="kpi-value green">${Util.fmtMoney(totalDeposit)}</span></div>
            <div class="kpi-item"><span class="kpi-label">累计开票</span><span class="kpi-value">${Util.fmtMoney(totalInvoice)}</span></div>
            <div class="kpi-item"><span class="kpi-label">待收款</span><span class="kpi-value orange">${Util.fmtMoney(Math.max(0, totalAmount - totalDeposit))}</span></div>
          </div>
        </div>
      `;
    },

    listReview() {
      const list = Store.orders(function (o) { return o.status === 'review'; });
      return `
        <div class="page-header"><div><h2>超预估复核列表</h2>
          <div class="sub">报价超过客服预估上限，需要财务审批后才可到达客户确认环节。共 ${list.length} 条</div></div></div>
        <div class="card">
          ${list.length ? ServicePanel.orderListView(list, true) : UI.emptyState('暂无复核工单')}
        </div>
      `;
    },

    listFinance() {
      const list = Store.orders(function (o) {
        return ['confirmed','working','change','checking','rework','done'].includes(o.status);
      });
      return `
        <div class="page-header"><div><h2>财务操作（收款、开票、冲正）</h2>
          <div class="sub">对已确认报价或已完工的工单进行收款、开票、冲正操作</div></div></div>
        <div class="card">
          ${list.length ? financeList(list) : UI.emptyState('暂无可操作工单')}
        </div>
      `;
    },

    listAll() {
      return `
        <div class="page-header"><div><h2>全部工单（财务视角）</h2><div class="sub">查看所有工单的财务信息</div></div></div>
        <div class="card">
          ${ServicePanel.orderListView(Store.orders(), true)}
        </div>
      `;
    },

    orderDetail(orderId) {
      const order = Store.getOrder(orderId);
      if (!order) return UI.emptyState('工单不存在');
      const users = Store.users();
      const tech = order.techUserId ? users[order.techUserId] : null;
      const client = users[order.clientId];

      const actions = [];
      if (order.status === 'review') {
        actions.push(`<button class="btn btn-success" onclick="ReviewerPanel.reviewApprove('${order.id}', true)">✅ 复核通过</button>`);
        actions.push(`<button class="btn btn-danger" onclick="ReviewerPanel.reviewApprove('${order.id}', false)">❌ 驳回报价</button>`);
      }
      actions.push(`<button class="btn btn-warning" onclick="ReviewerPanel.recordDeposit('${order.id}')">💰 登记收款</button>`);
      actions.push(`<button class="btn btn-primary" onclick="ReviewerPanel.recordInvoice('${order.id}')">🧾 开具发票</button>`);
      actions.push(`<button class="btn btn-secondary" onclick="ReviewerPanel.recordCorrection('${order.id}')">📝 费用冲正</button>`);
      actions.push(`<button class="btn btn-secondary" onclick="App.sendMessage('${order.id}')">💬 发消息</button>`);

      return `
        <div class="page-header">
          <div>
            <h2>
              <button class="btn btn-secondary btn-sm" onclick="App.router.back()" style="margin-right:10px">← 返回</button>
              财务视角 · ${order.title}
              <span class="tag ${Util.statusLabel(order.status).cls}" style="margin-left:10px">${Util.statusLabel(order.status).text}</span>
              ${order.priceLocked ? '<span title="已开工锁价" style="margin-left:6px">🔒</span>' : ''}
            </h2>
            <div class="sub"><code>${order.id}</code> · 创建于 ${Util.fmtTime(order.createdAt)}</div>
          </div>
          <div>${actions.join('')}</div>
        </div>
        ${UI.statusBanner(order)}
        ${order.status === 'review' && order.overEstimateReason ? `
          <div class="card">
            <div class="card-title">⚠️ 超预估复核详情</div>
            <div class="kpi-row">
              <div class="kpi-item"><span class="kpi-label">报价总额</span><span class="kpi-value red">${Util.fmtMoney(order.pricing.total)}</span></div>
              <div class="kpi-item"><span class="kpi-label">预估上限</span><span class="kpi-value">${Util.fmtMoney(order.estimateUpper)}</span></div>
              <div class="kpi-item"><span class="kpi-label">超出金额</span><span class="kpi-value red">+${Util.fmtMoney(order.pricing.total - order.estimateUpper)}</span></div>
              <div class="kpi-item"><span class="kpi-label">超出比例</span><span class="kpi-value orange">${Math.round((order.pricing.total / order.estimateUpper * 100 - 100))}%</span></div>
            </div>
            <div class="divider"></div>
            <div class="section-title">📝 师傅填写的超预估原因</div>
            <div style="padding:12px 16px;background:#fff7e6;border-radius:6px;color:#ad4e00">${order.overEstimateReason}</div>
          </div>
        ` : ''}
        <div class="card">
          <div class="card-title">🧾 财务总览</div>
          ${UI.financeOverview(order)}
        </div>
        <div class="card">
          <div class="card-title">💰 报价明细</div>
          ${UI.pricingBreakdown(order)}
        </div>
        ${order.invoices && order.invoices.length ? `
          <div class="card">
            <div class="card-title">🧾 发票记录</div>
            <table class="data-table">
              <thead><tr><th>发票号</th><th>日期</th><th>金额</th><th>状态</th></tr></thead>
              <tbody>${order.invoices.map(function (i) { return `<tr><td>${i.invoiceNo}</td><td>${Util.fmtDate(i.date)}</td><td>${Util.fmtMoney(i.amount)}</td><td><span class="tag tag-success">已开具</span></td></tr>`; }).join('')}</tbody>
            </table>
          </div>` : ''}
        <div class="card">
          <div class="card-title">📜 完整时间线（含财务操作记录）</div>
          ${Timeline.render(order)}
        </div>
      `;
    },

    reviewApprove(orderId, pass) {
      const order = Store.getOrder(orderId);
      if (!order) return;
      if (pass) {
        UI.prompt('复核通过', {
          label: '审批意见（可空）',
          multiline: true, rows: 2, required: false,
          default: '同意该超预估报价，请与客户沟通后安排施工。'
        }).then(function (note) {
          if (note === null) return;
          runSafely(function () {
            State.reviewerApprove(orderId, true, note);
            UI.toast('复核通过，已推送客户确认', 'success');
            App.router.refresh();
          });
        });
      } else {
        UI.prompt('驳回报价', {
          label: '请填写驳回原因（≥5字）',
          multiline: true, rows: 3, required: true,
          placeholder: '请说明驳回原因，如：价格过高、需精简项目等，师傅将据此修改后重新提交...'
        }).then(function (note) {
          if (note === null) return;
          runSafely(function () {
            State.reviewerApprove(orderId, false, note);
            UI.toast('已驳回，师傅将重报', 'warning');
            App.router.refresh();
          });
        });
      }
    },

    recordDeposit(orderId) {
      const order = Store.getOrder(orderId);
      if (!order) return;
      const total = order.pricing.total || 0;
      const unpaid = Math.max(0, total - Number(order.deposit || 0));
      UI.prompt('登记收款 / 订金', {
        label: '本次收款金额（元）',
        default: String(unpaid || total || 500),
        placeholder: '请输入金额'
      }).then(function (amountStr) {
        if (amountStr === null) return;
        const amount = Number(amountStr);
        if (!amount || amount <= 0) return UI.toast('金额无效', 'warning');
        return UI.prompt('收款备注', {
          label: '备注（可空）', multiline: false, required: false,
          default: unpaid > 0 ? (amount >= unpaid ? '客户尾款结清' : '客户支付部分款项') : '客户追加支付订金'
        }).then(function (note) {
          if (note === null) return;
          runSafely(function () {
            State.recordDeposit(orderId, amount, note);
            UI.toast('已登记收款 ' + Util.fmtMoney(amount), 'success');
            App.router.refresh();
          });
        });
      });
    },

    recordInvoice(orderId) {
      const order = Store.getOrder(orderId);
      if (!order) return;
      const total = order.pricing.total || 0;
      const invTotal = (order.invoices || []).reduce(function (s, i) { return s + Number(i.amount || 0); }, 0);
      const remain = Math.max(0, total - invTotal);
      UI.prompt('开具发票', {
        label: '开票金额（元）',
        default: String(remain || total || 0),
        placeholder: '请输入金额'
      }).then(function (amountStr) {
        if (amountStr === null) return;
        const amount = Number(amountStr);
        if (!amount || amount <= 0) return UI.toast('金额无效', 'warning');
        const d = new Date();
        const pad = function (x) { return String(x).padStart(2, '0'); };
        const no = 'FP' + d.getFullYear() + pad(d.getMonth() + 1) + pad(d.getDate()) + '-' + String(Date.now()).slice(-4);
        return UI.prompt('发票号', {
          label: '发票号（可自动生成）', required: false, default: no
        }).then(function (invNo) {
          if (invNo === null) return;
          runSafely(function () {
            State.recordInvoice(orderId, amount, invNo);
            UI.toast('已开票 ' + Util.fmtMoney(amount), 'success');
            App.router.refresh();
          });
        });
      });
    },

    recordCorrection(orderId) {
      const order = Store.getOrder(orderId);
      if (!order) return;
      UI.prompt('费用冲正', {
        label: '冲正金额（正数表示加款 / 负数表示扣款）',
        default: '-50',
        placeholder: '如：-50 表示扣款 50 元，+100 表示加款 100 元'
      }).then(function (amountStr) {
        if (amountStr === null) return;
        const amount = Number(amountStr);
        if (!amount) return UI.toast('金额无效', 'warning');
        return UI.prompt('冲正原因', {
          label: '冲正原因（≥8字）', multiline: true, rows: 3, required: true,
          default: amount < 0 ? '客户投诉质量问题，部分退款处理' : '补收客户额外款项'
        }).then(function (reason) {
          if (reason === null) return;
          runSafely(function () {
            State.recordCorrection(orderId, amount, reason);
            UI.toast('冲正成功 ' + (amount > 0 ? '加款' : '扣款') + ' ' + Util.fmtMoney(Math.abs(amount)), 'success');
            App.router.refresh();
          });
        });
      });
    }
  };

  function financeList(list) {
    const users = Store.users();
    const rows = list.map(function (o) {
      const s = Util.statusLabel(o.status);
      const tech = o.techUserId ? users[o.techUserId] : null;
      const client = users[o.clientId];
      const total = o.pricing.total || 0;
      const paid = Number(o.deposit || 0);
      const unpaid = Math.max(0, total - paid);
      const over = total > o.estimateUpper;
      const paidRate = total ? Math.round(paid / total * 100) : 0;
      const invTotal = (o.invoices || []).reduce(function (s, i) { return s + Number(i.amount || 0); }, 0);
      return `<div class="list-item">
        <div class="li-head">
          <div>
            <div class="li-title">
              <code style="color:#667eea;font-size:12px;margin-right:8px">${o.id}</code>
              ${o.title}
              <span class="tag ${s.cls}" style="margin-left:8px">${s.text}</span>
              ${o.priceLocked ? '<span style="margin-left:4px" title="已开工锁价">🔒</span>' : ''}
              ${over ? '<span class="tag tag-return" style="margin-left:4px">超预估</span>' : ''}
            </div>
            <div class="li-meta">
              ${o.category} · 客户：${client.name} · 师傅：${tech ? tech.name : '未指派'} · 创建于 ${Util.fmtTime(o.createdAt)}
            </div>
          </div>
          <div class="li-amount">${Util.fmtMoney(total)}
            <div style="text-align:right;font-weight:400;font-size:11px;color:#909399">
              已收 ${Util.fmtMoney(paid)} · 待收 ${Util.fmtMoney(unpaid)}
            </div>
          </div>
        </div>
        <div class="li-body" style="margin-top:10px">
          <div class="kpi-row">
            <div class="kpi-item"><span class="kpi-label">报价总额</span><span class="kpi-value">${Util.fmtMoney(total)}</span></div>
            <div class="kpi-item"><span class="kpi-label">已收款</span><span class="kpi-value ${paid ? 'green' : ''}">${Util.fmtMoney(paid)} (${paidRate}%)</span></div>
            <div class="kpi-item"><span class="kpi-label">待收款</span><span class="kpi-value ${unpaid ? 'orange' : 'green'}">${unpaid > 0 ? Util.fmtMoney(unpaid) : '已结清'}</span></div>
            <div class="kpi-item"><span class="kpi-label">已开票</span><span class="kpi-value">${Util.fmtMoney(invTotal)}</span></div>
          </div>
        </div>
        <div class="li-actions">
          <button class="btn btn-warning btn-sm" onclick="ReviewerPanel.recordDeposit('${o.id}')">💰 登记收款</button>
          <button class="btn btn-primary btn-sm" onclick="ReviewerPanel.recordInvoice('${o.id}')">🧾 开发票</button>
          <button class="btn btn-secondary btn-sm" onclick="ReviewerPanel.recordCorrection('${o.id}')">📝 冲正</button>
          <button class="btn btn-secondary btn-sm" onclick="App.openOrder('${o.id}','reviewer')">查看详情</button>
        </div>
      </div>`;
    }).join('');
    return rows;
  }

  global.ReviewerPanel = ReviewerPanel;
})(window);
