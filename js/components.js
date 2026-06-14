/* global window, Util */
(function (global) {

  const UI = {
    toast(msg, type = 'info', duration = 2500) {
      const root = document.getElementById('toastRoot');
      if (!root) return;
      if (!root.querySelector('.toast-container')) {
        const c = document.createElement('div');
        c.className = 'toast-container';
        root.appendChild(c);
      }
      const c = root.querySelector('.toast-container');
      const el = document.createElement('div');
      const icons = { success: '✅', warning: '⚠️', error: '❌', info: 'ℹ️' };
      el.className = 'toast ' + type;
      el.innerHTML = `<span class="t-icon">${icons[type] || 'ℹ️'}</span><span class="t-msg">${msg}</span>`;
      c.appendChild(el);
      setTimeout(() => {
        el.style.transition = 'all 0.25s';
        el.style.opacity = '0';
        el.style.transform = 'translateX(120%)';
        setTimeout(() => el.remove(), 300);
      }, duration);
    },

    confirm(title, message, okText = '确认', cancelText = '取消', danger = false) {
      return new Promise(resolve => {
        const root = document.getElementById('modalRoot');
        const mask = document.createElement('div');
        mask.className = 'modal-mask';
        mask.innerHTML = `
          <div class="modal" style="min-width:420px">
            <div class="modal-header">
              <h3>${title}</h3>
              <button class="modal-close">×</button>
            </div>
            <div class="modal-body"><p style="line-height:1.7;color:#4a5568">${message}</p></div>
            <div class="modal-footer">
              <button class="btn btn-secondary cancel">${cancelText}</button>
              <button class="btn ${danger ? 'btn-danger' : 'btn-primary'} ok">${okText}</button>
            </div>
          </div>`;
        root.appendChild(mask);
        const close = (val) => { mask.remove(); resolve(val); };
        mask.querySelector('.modal-close').onclick = () => close(false);
        mask.querySelector('.cancel').onclick = () => close(false);
        mask.querySelector('.ok').onclick = () => close(true);
        mask.onclick = (e) => { if (e.target === mask) close(false); };
      });
    },

    prompt(title, opts = {}) {
      return new Promise(resolve => {
        const root = document.getElementById('modalRoot');
        const mask = document.createElement('div');
        mask.className = 'modal-mask';
        const isTextarea = !!opts.multiline;
        const rows = opts.rows || 4;
        const placeholder = opts.placeholder || '请输入...';
        const required = opts.required !== false;
        mask.innerHTML = `
          <div class="modal" style="min-width:500px">
            <div class="modal-header">
              <h3>${title}</h3>
              <button class="modal-close">×</button>
            </div>
            <div class="modal-body">
              ${opts.label ? `<label style="font-size:13px;color:#606266;margin-bottom:8px;display:block">${opts.label}</label>` : ''}
              ${isTextarea
                ? `<textarea class="prompt-input" rows="${rows}" placeholder="${placeholder}" style="width:100%;padding:10px 12px;border:1px solid #dcdfe6;border-radius:6px;resize:vertical;outline:none">${opts.default || ''}</textarea>`
                : `<input class="prompt-input" value="${opts.default || ''}" placeholder="${placeholder}" style="width:100%;padding:10px 12px;border:1px solid #dcdfe6;border-radius:6px;outline:none" />`}
              ${opts.hint ? `<div style="color:#909399;font-size:12px;margin-top:6px">${opts.hint}</div>` : ''}
            </div>
            <div class="modal-footer">
              <button class="btn btn-secondary cancel">取消</button>
              <button class="btn btn-primary ok">确认</button>
            </div>
          </div>`;
        root.appendChild(mask);
        const close = (val) => { mask.remove(); resolve(val); };
        mask.querySelector('.modal-close').onclick = () => close(null);
        mask.querySelector('.cancel').onclick = () => close(null);
        mask.querySelector('.ok').onclick = () => {
          const v = mask.querySelector('.prompt-input').value.trim();
          if (required && !v) { UI.toast('内容不能为空', 'warning'); return; }
          close(v);
        };
        mask.onclick = (e) => { if (e.target === mask) close(null); };
        setTimeout(() => mask.querySelector('.prompt-input').focus(), 100);
      });
    },

    openModal({ title, body, footer, width, onOpen, className }) {
      const root = document.getElementById('modalRoot');
      const mask = document.createElement('div');
      mask.className = 'modal-mask';
      const size = width ? `style="min-width:${width}px"` : '';
      const cls = className || '';
      mask.innerHTML = `
        <div class="modal ${cls}" ${size}>
          <div class="modal-header">
            <h3>${title}</h3>
            <button class="modal-close">×</button>
          </div>
          <div class="modal-body modal-body-slot"></div>
          ${footer ? `<div class="modal-footer modal-footer-slot"></div>` : ''}
        </div>`;
      root.appendChild(mask);
      mask.querySelector('.modal-body-slot').innerHTML = body || '';
      if (footer) mask.querySelector('.modal-footer-slot').innerHTML = footer;
      const api = {
        el: mask,
        body: mask.querySelector('.modal-body-slot'),
        footer: mask.querySelector('.modal-footer-slot'),
        close() { mask.remove(); },
        setBody(html) { mask.querySelector('.modal-body-slot').innerHTML = html; return api; },
        setFooter(html) { if (mask.querySelector('.modal-footer-slot')) mask.querySelector('.modal-footer-slot').innerHTML = html; return api; }
      };
      mask.querySelector('.modal-close').onclick = () => api.close();
      mask.onclick = (e) => { if (e.target === mask) api.close(); };
      if (onOpen) onOpen(api);
      return api;
    },

    statusBanner(order) {
      const s = Util.statusLabel(order.status);
      const over = order.pricing.total > order.estimateUpper;
      let banner = '';
      if (order.priceLocked) {
        banner = `<div class="quote-lock">已开工，原始报价已锁价。修改报价请走「变更单」流程。</div>`;
      }
      if (order.status === 'draft') {
        banner = (banner || '') + `<div class="status-banner info">📝 状态：<b>待派单</b> — 客户已提交需求，请尽快指派师傅。</div>`;
      } else if (order.status === 'assigned') {
        banner = (banner || '') + `<div class="status-banner info">🏠 状态：<b>待勘查</b> — 已指派师傅等待上门勘查。</div>`;
      } else if (order.status === 'review' || order.reviewStatus === 'pending') {
        banner = (banner || '') + `<div class="status-banner warning">💰 状态：<b>超预估复核</b> — 报价 ${Util.fmtMoney(order.pricing.total)} 超出预估上限 ${Util.fmtMoney(order.estimateUpper)}，等待财务复核。</div>`;
      } else if (order.status === 'pending') {
        banner = (banner || '') + `<div class="status-banner warning">🤝 状态：<b>客户待确认</b> — 等待客户确认报价。</div>`;
      } else if (order.status === 'returned') {
        banner = (banner || '') + `<div class="status-banner error">↩️ 状态：<b>已退回重报</b>
          ${order.returnReason ? `<div class="reason-box" style="margin-top:8px">退回原因：${order.returnReason}</div>` : ''}
        </div>`;
      } else if (order.status === 'confirmed') {
        banner = (banner || '') + `<div class="status-banner success">✅ 状态：<b>客户已确认</b> — 可安排师傅开工。</div>`;
      } else if (order.status === 'working') {
        banner = (banner || '') + `<div class="status-banner info">🛠️ 状态：<b>施工中</b> — 正在施工。${over ? '<span style="color:#f5222d">（该工单最终报价已超预估上限，已通过复核。）</span>' : ''}</div>`;
      } else if (order.status === 'change') {
        banner = (banner || '') + `<div class="status-banner warning">📋 状态：<b>变更审批中</b> — 有变更单等待客户确认。</div>`;
      } else if (order.status === 'checking') {
        banner = (banner || '') + `<div class="status-banner info">🔍 状态：<b>待验收</b> — 等待客户验收。</div>`;
      } else if (order.status === 'rework') {
        banner = (banner || '') + `<div class="status-banner error">🔧 状态：<b>返修中</b> — 第 ${order.reworkCount} 次返修。${order.reworkNote ? `<div class="reason-box" style="margin-top:6px">返修原因：${order.reworkNote}</div>` : ''}</div>`;
      } else if (order.status === 'done') {
        banner = (banner || '') + `<div class="status-banner success">🎉 状态：<b>已完成归档</b> — 工单圆满完成。</div>`;
      }
      if (!order.priceLocked && over && order.status !== 'review' && order.status !== 'returned' && order.status !== 'done' && order.reviewStatus !== 'approved') {
        banner = (banner || '') + `<div class="status-banner error">💸 报价 <b class="price-over">${Util.fmtMoney(order.pricing.total)}</b> 已超出预估上限 ${Util.fmtMoney(order.estimateUpper)}，超出 ${Util.fmtMoney(order.pricing.total - order.estimateUpper)}。${order.overEstimateReason ? `原因：${order.overEstimateReason}` : '<b>请填写超预估原因后提交复核。</b>'}</div>`;
      }
      return banner;
    },

    pricingBreakdown(order, highlightOver = true) {
      const p = order.pricing || Util.calcOrderPricing(order);
      const over = highlightOver && p.total > (order.estimateUpper || 0);
      return `
        <div style="background:#fafbfc;padding:14px 18px;border-radius:8px;border:1px solid #ebedf0">
          <div class="price-row"><span class="label">材料费</span><span class="value">${Util.fmtMoney(p.materials)}</span></div>
          <div class="price-row"><span class="label">工时费</span><span class="value">${Util.fmtMoney(p.labor)}</span></div>
          <div class="price-row"><span class="label">上门费</span><span class="value">${Util.fmtMoney(p.visit)}</span></div>
          ${(p.addon > 0) ? `<div class="price-row"><span class="label">追加/变更项</span><span class="value" style="color:#fa8c16">+ ${Util.fmtMoney(p.addon)}</span></div>` : ''}
          <div class="price-row"><span class="label">小计</span><span class="value">${Util.fmtMoney(p.subtotal)}</span></div>
          ${(p.discount > 0) ? `<div class="price-row"><span class="label">优惠/折扣</span><span class="value" style="color:#52c41a">- ${Util.fmtMoney(p.discount)}</span></div>` : ''}
          <div class="price-total"><span>报价总额</span><span class="${over ? 'value price-over' : 'value'}">${Util.fmtMoney(p.total)}</span></div>
          <div style="display:flex;justify-content:space-between;margin-top:8px;padding-top:10px;border-top:1px dashed #ebedf0;font-size:12px;color:#909399">
            <span>客户心理价：${Util.fmtMoney(order.customerBudget || 0)}</span>
            <span>预估上限：${Util.fmtMoney(order.estimateUpper || 0)}</span>
            <span>${over ? `<b style="color:#f5222d">超上限 ${Util.fmtMoney(p.total - order.estimateUpper)}</b>` : `<b style="color:#52c41a">剩余额度 ${Util.fmtMoney((order.estimateUpper || 0) - p.total)}</b>`}</span>
          </div>
        </div>`;
    },

    materialsTable(order, editable = false, onUpdate) {
      const rows = (order.materials || []).map((m, i) => {
        const total = (Number(m.price) || 0) * (Number(m.qty) || 0);
        return `<tr data-i="${i}">
          <td><code>${m.code || '—'}</code></td>
          <td><b>${m.name}</b></td>
          <td>${m.unit || ''}</td>
          <td>${editable ? `<input type="number" min="0" step="0.1" class="m-price" value="${Number(m.price||0).toFixed(2)}" style="width:90px;padding:4px 6px;border:1px solid #dcdfe6;border-radius:4px">` : Util.fmtMoney(m.price)}</td>
          <td>${editable ? `<input type="number" min="0" step="1" class="m-qty" value="${Number(m.qty||0)}" style="width:70px;padding:4px 6px;border:1px solid #dcdfe6;border-radius:4px">` : m.qty}</td>
          <td class="m-total" style="color:#ff4b2b;font-weight:600">${Util.fmtMoney(total)}</td>
          ${editable ? `<td><button class="btn btn-danger btn-sm m-del">删除</button></td>` : ''}
        </tr>`;
      }).join('') || `<tr><td colspan="${editable ? 7 : 6}" class="empty">暂无材料清单</td></tr>`;
      return `
        <table class="data-table">
          <thead><tr>
            <th style="width:100px">编码</th><th>名称</th><th style="width:70px">单位</th>
            <th style="width:120px">单价</th><th style="width:90px">数量</th><th style="width:110px">小计</th>
            ${editable ? '<th style="width:80px">操作</th>' : ''}
          </tr></thead>
          <tbody>${rows}</tbody>
        </table>`;
    },

    laborTable(order, editable = false) {
      const rows = (order.labor || []).map((l, i) => {
        const total = (Number(l.price) || 0) * (Number(l.qty) || 0);
        return `<tr data-i="${i}">
          <td>${editable ? `<input class="l-item" value="${l.item||''}" style="width:100%;padding:4px 6px;border:1px solid #dcdfe6;border-radius:4px">` : (l.item || '')}</td>
          <td>${l.unit || ''}</td>
          <td>${editable ? `<input type="number" min="0" step="0.1" class="l-price" value="${Number(l.price||0).toFixed(2)}" style="width:100px;padding:4px 6px;border:1px solid #dcdfe6;border-radius:4px">` : Util.fmtMoney(l.price)}</td>
          <td>${editable ? `<input type="number" min="0" step="1" class="l-qty" value="${Number(l.qty||0)}" style="width:70px;padding:4px 6px;border:1px solid #dcdfe6;border-radius:4px">` : l.qty}</td>
          <td class="l-total" style="color:#ff4b2b;font-weight:600">${Util.fmtMoney(total)}</td>
          ${editable ? `<td><button class="btn btn-danger btn-sm l-del">删除</button></td>` : ''}
        </tr>`;
      }).join('') || `<tr><td colspan="${editable ? 6 : 5}" class="empty">暂无工时项目</td></tr>`;
      return `
        <table class="data-table">
          <thead><tr>
            <th>工时项目</th><th style="width:80px">单位</th>
            <th style="width:120px">单价</th><th style="width:90px">数量</th>
            <th style="width:110px">小计</th>${editable ? '<th style="width:80px">操作</th>' : ''}
          </tr></thead>
          <tbody>${rows}</tbody>
        </table>`;
    },

    addItemsTable(addItems, changeOrders) {
      const all = (addItems || []).slice();
      if (!all.length) return '<div style="color:#909399;padding:10px 0">暂无追加项</div>';
      const rows = all.map(a => `
        <tr>
          <td>${a.changeId ? `<code>#${a.changeId}</code>` : '<span style="color:#909399">开工前追加</span>'}</td>
          <td>${a.name}</td>
          <td>${a.amount > 0 ? '+' : ''}${Util.fmtMoney(a.amount)}</td>
          <td>${a.reason || '—'}</td>
          <td>${a.approved === false
              ? '<span class="tag tag-return">已驳回</span>'
              : a.approved
                ? '<span class="tag tag-success">已确认</span>'
                : '<span class="tag tag-pending">待确认</span>'}</td>
        </tr>
      `).join('');
      return `
        <table class="data-table">
          <thead><tr>
            <th style="width:120px">来源</th><th>项目</th><th style="width:130px">金额</th>
            <th>原因</th><th style="width:100px">状态</th>
          </tr></thead>
          <tbody>${rows}</tbody>
        </table>`;
    },

    financeOverview(order) {
      const total = (order.pricing || {}).total || 0;
      const paid = Number(order.deposit || 0);
      const unpaid = Math.max(0, total - paid);
      const invTotal = (order.invoices || []).reduce((s, x) => s + Number(x.amount || 0), 0);
      return `
        <div class="kpi-row">
          <div class="kpi-item"><span class="kpi-label">报价总额</span><span class="kpi-value">${Util.fmtMoney(total)}</span></div>
          <div class="kpi-item"><span class="kpi-label">已收款</span><span class="kpi-value ${paid ? 'green' : ''}">${Util.fmtMoney(paid)}</span></div>
          <div class="kpi-item"><span class="kpi-label">待收款</span><span class="kpi-value ${unpaid ? 'orange' : ''}">${Util.fmtMoney(unpaid)}</span></div>
          <div class="kpi-item"><span class="kpi-label">已开票</span><span class="kpi-value">${Util.fmtMoney(invTotal)}</span></div>
          <div class="kpi-item"><span class="kpi-label">收款进度</span><span class="kpi-value ${total ? (paid >= total ? 'green' : 'orange') : ''}">${total ? Math.round(paid / total * 100) : 0}%</span></div>
        </div>`;
    },

    warrantyBox(order) {
      if (!order.warranty || !order.warranty.months) return '';
      return `<div class="warranty-box">
        <div class="w-icon">🛡️</div>
        <div class="w-text">
          <div class="w-title">保修 ${order.warranty.months} 个月</div>
          <div class="w-desc">${order.warranty.scope || '按行业标准保修'}</div>
        </div>
      </div>`;
    },

    emptyState(text, icon = '📭') {
      return `<div style="text-align:center;padding:60px 20px;color:#909399">
        <div style="font-size:52px;margin-bottom:16px">${icon}</div>
        <div style="font-size:15px">${text}</div>
      </div>`;
    },

    orderList(orders, renderRow) {
      if (!orders.length) return UI.emptyState('暂无数据');
      return orders.map(renderRow).join('');
    }
  };

  global.UI = UI;
})(window);
