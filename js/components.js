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
    },

    feeTypeTag(feeType, amount) {
      const types = typeof FEE_TYPES !== 'undefined' ? FEE_TYPES : {
        DEPOSIT_DEDUCT: { key: 'deposit_deduct', name: '订金抵扣', icon: '💰', color: '#52c41a' },
        SECOND_VISIT: { key: 'second_visit', name: '二次上门', icon: '🚗', color: '#fa8c16' },
        REWORK_FREE: { key: 'rework_free', name: '返修免单', icon: '🎁', color: '#1890ff' },
        CORRECTION: { key: 'correction', name: '费用冲正', icon: '📝', color: '#722ed1' },
        ADDON_BLOCKED: { key: 'addon_blocked', name: '追加拦截', icon: '🚫', color: '#f5222d' },
        REPLACEMENT: { key: 'replacement', name: '替代件', icon: '🔄', color: '#eb2f96' }
      };
      const key = (feeType || '').toUpperCase().replace(/-/g, '_');
      const typeInfo = types[key] || { name: feeType, icon: '📌', color: '#909399' };
      const amt = amount !== undefined && amount !== null
        ? `<span style="margin-left:4px;font-weight:600">${amount > 0 ? '+' : ''}${Util.fmtMoney(amount)}</span>`
        : '';
      return `<span class="fee-tag" style="background:${typeInfo.color}15;color:${typeInfo.color};border-color:${typeInfo.color}40">
        <span>${typeInfo.icon}</span>
        <span>${typeInfo.name}</span>
        ${amt}
      </span>`;
    },

    photoWall(photos, options = {}) {
      if (!photos || !photos.length) {
        return options.allowUpload
          ? `<div class="photo-wall empty">
              <div class="photo-upload-placeholder">
                <div style="font-size:36px;margin-bottom:8px">📷</div>
                <div style="color:#909399;font-size:13px">点击上传照片</div>
                <input type="file" accept="image/*" multiple class="photo-upload-input" style="display:none">
              </div>
            </div>`
          : '<div style="color:#909399;font-size:13px;padding:10px 0">暂无照片</div>';
      }
      const photoItems = photos.map((p, i) => {
        const url = typeof p === 'string'
          ? `https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=${encodeURIComponent(p)}&image_size=square`
          : p.url || '';
        const caption = typeof p === 'object' ? p.caption || '' : p;
        return `<div class="photo-item" data-i="${i}">
          <div class="photo-img-wrap">
            <img src="${url}" alt="${caption}" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'">
            <div class="photo-fallback" style="display:none;background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);color:white;display:none;align-items:center;justify-content:center;font-size:24px">
              📷
            </div>
          </div>
          ${options.showCaption !== false ? `<div class="photo-caption">${caption}</div>` : ''}
          ${options.allowDelete ? `<button class="photo-delete" data-i="${i}">×</button>` : ''}
        </div>`;
      }).join('');
      const uploadHtml = options.allowUpload ? `
        <div class="photo-item upload">
          <div class="photo-upload-trigger">
            <div style="font-size:32px;margin-bottom:4px">+</div>
            <div style="font-size:12px;color:#909399">添加照片</div>
          </div>
          <input type="file" accept="image/*" multiple class="photo-upload-input" style="display:none">
        </div>` : '';
      return `<div class="photo-wall">${photoItems}${uploadHtml}</div>`;
    },

    phaseProgress(phases) {
      if (!phases || !phases.length) return '';
      const total = phases.length;
      const completed = phases.filter(p => p.status === 'done' || p.status === 'accepted').length;
      const accepted = phases.filter(p => p.status === 'accepted').length;
      const percent = Math.round((completed / total) * 100);
      const phasesHtml = phases.map((p, i) => {
        const statusLabel = Store.getPhaseStatusLabel(p.status);
        const isActive = p.status === 'working';
        const isDone = p.status === 'done' || p.status === 'accepted';
        const itemsTotal = (p.items || []).length;
        const itemsConfirmed = (p.items || []).filter(it => it.confirmed).length;
        const itemsAccepted = (p.items || []).filter(it => it.accepted).length;
        return `<div class="phase-step ${p.status} ${isActive ? 'active' : ''} ${isDone ? 'done' : ''}">
          <div class="phase-circle">
            ${isDone ? '✓' : (i + 1)}
          </div>
          <div class="phase-info">
            <div class="phase-name">${p.name}</div>
            <div class="phase-desc">${p.desc || ''}</div>
            <div class="phase-meta">
              <span class="tag ${statusLabel.cls}">${statusLabel.text}</span>
              ${itemsTotal > 0 ? `<span style="font-size:12px;color:#909399">${itemsAccepted}/${itemsConfirmed}/${itemsTotal} 项</span>` : ''}
              ${p.acceptedAt ? `<span style="font-size:12px;color:#52c41a">验收：${Util.fmtTime(p.acceptedAt)}</span>` : ''}
            </div>
            ${p.items && p.items.length > 0 ? `
              <div class="phase-items">
                ${p.items.map(it => `
                  <div class="phase-item ${it.confirmed ? 'confirmed' : 'unconfirmed'} ${it.accepted ? 'accepted' : ''} ${it.isChange ? 'is-change' : ''} ${Store.isBlocked ? (Store.isBlocked(null, it.id) ? 'blocked' : '') : ''}">
                    <span class="item-check">${it.accepted ? '✅' : it.confirmed ? '☑️' : '⬜'}</span>
                    <span class="item-name">${it.name}</span>
                    <span class="item-amount">${Util.fmtMoney(it.amount)}</span>
                    ${it.isChange ? '<span class="tag tag-change" style="margin-left:6px">变更</span>' : ''}
                    ${Store.isBlocked && Store.isBlocked(null, it.id) ? '<span class="tag tag-return" style="margin-left:6px">🔒 锁定</span>' : ''}
                  </div>
                `).join('')}
              </div>
            ` : ''}
          </div>
          ${i < phases.length - 1 ? '<div class="phase-line"></div>' : ''}
        </div>`;
      }).join('');
      return `
        <div class="phase-progress">
          <div class="phase-progress-header">
            <h4>📊 分阶段验收进度</h4>
            <div class="phase-progress-stats">
              <span>总进度：<b>${percent}%</b></span>
              <span>已完成：<b>${completed}/${total}</b> 阶段</span>
              <span>已验收：<b>${accepted}/${total}</b> 阶段</span>
            </div>
          </div>
          <div class="phase-progress-bar">
            <div class="phase-progress-fill" style="width:${percent}%"></div>
          </div>
          <div class="phase-steps">
            ${phasesHtml}
          </div>
        </div>
      `;
    },

    itemConfirmTable(phases, options = {}) {
      const allItems = [];
      (phases || []).forEach(p => {
        (p.items || []).forEach(it => {
          allItems.push({ ...it, phaseKey: p.key, phaseName: p.name, phaseStatus: p.status });
        });
      });
      if (!allItems.length) return '<div style="color:#909399;padding:10px 0">暂无项目</div>';
      const checkHtml = (it) => {
        if (!options.editable) {
          return it.confirmed
            ? `<span class="tag tag-success">已确认</span>`
            : `<span class="tag tag-pending">待确认</span>`;
        }
        return `<input type="checkbox" class="item-confirm-check" data-id="${it.id}" ${it.confirmed ? 'checked' : ''} ${it.accepted ? 'disabled' : ''}>`;
      };
      const rows = allItems.map(it => `
        <tr class="${it.confirmed ? '' : 'unconfirmed-row'} ${it.accepted ? 'accepted-row' : ''} ${it.isChange ? 'change-row' : ''}">
          <td style="width:50px">${checkHtml(it)}</td>
          <td style="width:100px"><span class="tag tag-info">${it.phaseName}</span></td>
          <td><b>${it.name}</b>${it.isChange ? '<span class="tag tag-change" style="margin-left:8px">变更项</span>' : ''}${it.reason ? `<div style="color:#909399;font-size:12px;margin-top:4px">📝 ${it.reason}</div>` : ''}</td>
          <td style="width:120px;text-align:right;font-weight:600">${Util.fmtMoney(it.amount)}</td>
          <td style="width:100px">${it.accepted ? '<span class="tag tag-success">已验收</span>' : it.confirmed ? '<span class="tag tag-info">已确认</span>' : '<span class="tag tag-draft">未确认</span>'}</td>
        </tr>
      `).join('');
      const confirmedCount = allItems.filter(it => it.confirmed).length;
      const totalCount = allItems.length;
      const summaryHtml = options.editable ? `
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;padding:10px 14px;background:#f0f5ff;border-radius:6px">
          <span>已确认 <b style="color:#1890ff">${confirmedCount}</b> / ${totalCount} 项</span>
          <div>
            <button class="btn btn-secondary btn-sm select-all-btn">全选</button>
            <button class="btn btn-secondary btn-sm clear-all-btn" style="margin-left:8px">清空</button>
          </div>
        </div>
      ` : `
        <div style="padding:8px 14px;background:#f6ffed;border-radius:6px;margin-bottom:12px">
          已确认 <b style="color:#52c41a">${confirmedCount}</b> / ${totalCount} 项
          ${confirmedCount < totalCount ? `<span style="color:#fa8c16;margin-left:12px">⚠️ 有 ${totalCount - confirmedCount} 项未确认，禁止开工</span>` : ''}
        </div>
      `;
      return `
        ${summaryHtml}
        <table class="data-table item-confirm-table">
          <thead><tr>
            <th>确认</th><th>所属阶段</th><th>项目名称</th><th style="text-align:right">金额</th><th>状态</th>
          </tr></thead>
          <tbody>${rows}</tbody>
        </table>
      `;
    },

    replacementSelector(currentCode, options = {}) {
      const replacements = Store.getReplacementOptions(currentCode);
      if (!replacements.length) return '';
      const currentMat = (typeof MATERIAL_CATALOG !== 'undefined' ? MATERIAL_CATALOG : []).find(m => m.code === currentCode)
        || Store.materials().find(m => m.code === currentCode);
      if (!currentMat) return '';
      const optionsHtml = replacements.map(r => `
        <div class="replacement-option" data-code="${r.code}">
          <div class="replacement-header">
            <div class="replacement-name">
              <span class="rep-icon">🔄</span>
              <b>${r.name}</b>
              ${r.isReplacement ? '<span class="tag tag-change" style="margin-left:8px">库存替代件</span>' : ''}
            </div>
            <div class="replacement-price ${r.price < currentMat.price ? 'down' : r.price > currentMat.price ? 'up' : ''}">
              ${r.price < currentMat.price ? '↓' : r.price > currentMat.price ? '↑' : '='} ${Util.fmtMoney(r.price)} / ${r.unit}
            </div>
          </div>
          <div class="replacement-warranty">
            <span style="color:#909399">保修期：</span>
            <span class="${r.warrantyMonths < currentMat.warrantyMonths ? 'warranty-down' : 'warranty-up'}">
              ${r.warrantyMonths < currentMat.warrantyMonths ? '⚠️' : '✅'}
              ${currentMat.warrantyMonths}个月 → <b>${r.warrantyMonths}个月</b>
            </span>
          </div>
          <div class="replacement-diff">
            <div class="diff-item">
              <span>单价差异</span>
              <b class="${r.price < currentMat.price ? 'green' : r.price > currentMat.price ? 'red' : ''}">
                ${r.price < currentMat.price ? '-' : r.price > currentMat.price ? '+' : ''}${Util.fmtMoney(Math.abs(r.price - currentMat.price))}
              </b>
            </div>
            <div class="diff-item">
              <span>保修差异</span>
              <b class="${r.warrantyMonths < currentMat.warrantyMonths ? 'red' : r.warrantyMonths > currentMat.warrantyMonths ? 'green' : ''}">
                ${r.warrantyMonths < currentMat.warrantyMonths ? '-' : r.warrantyMonths > currentMat.warrantyMonths ? '+' : ''}${Math.abs(r.warrantyMonths - currentMat.warrantyMonths)}个月
              </b>
            </div>
          </div>
          ${options.editable ? `
            <button class="btn btn-outline btn-sm select-replacement-btn" data-code="${r.code}">
              选择此替代件
            </button>
          ` : ''}
        </div>
      `).join('');
      return `
        <div class="replacement-selector">
          <div class="replacement-current">
            <div style="color:#606266;font-size:12px;margin-bottom:4px">当前材料</div>
            <div style="display:flex;justify-content:space-between;align-items:center">
              <div>
                <b>${currentMat.name}</b> <code style="color:#909399">#${currentMat.code}</code>
              </div>
              <div style="text-align:right">
                <div>${Util.fmtMoney(currentMat.price)} / ${currentMat.unit}</div>
                <div style="color:#52c41a;font-size:12px">保修 ${currentMat.warrantyMonths} 个月</div>
              </div>
            </div>
          </div>
          <div style="text-align:center;color:#909399;padding:8px 0">↓ 可选择库存替代件 ↓</div>
          <div class="replacement-list">
            ${optionsHtml}
          </div>
        </div>
      `;
    },

    feeAdjustmentsPanel(adjustments) {
      if (!adjustments || !adjustments.length) return '';
      const totalAdj = adjustments.reduce((s, a) => s + Number(a.amount || 0), 0);
      const rows = adjustments.map(a => `
        <tr>
          <td>${UI.feeTypeTag(a.type, a.amount)}</td>
          <td>${a.note || ''}</td>
          <td style="text-align:right;font-weight:600;${a.amount < 0 ? 'color:#52c41a' : a.amount > 0 ? 'color:#f5222d' : ''}">
            ${a.amount > 0 ? '+' : ''}${Util.fmtMoney(a.amount)}
          </td>
          <td style="color:#909399;font-size:12px">${Util.fmtTime(a.createdAt)}</td>
        </tr>
      `).join('');
      return `
        <div class="fee-adjustments-panel">
          <h4 style="margin:0 0 12px 0">💱 费用调整记录 ${totalAdj !== 0 ? `<span style="float:right;font-size:14px;font-weight:normal;color:${totalAdj < 0 ? '#52c41a' : '#f5222d'}">累计 ${totalAdj > 0 ? '+' : ''}${Util.fmtMoney(totalAdj)}</span>` : ''}</h4>
          <table class="data-table">
            <thead><tr>
              <th style="width:140px">类型</th><th>说明</th><th style="width:120px;text-align:right">金额</th><th style="width:160px">操作时间</th>
            </tr></thead>
            <tbody>${rows}</tbody>
          </table>
        </div>
      `;
    },

    detailedWarrantyBox(order) {
      if (!order.warranty) return '';
      const items = (order.warranty.items || []).map(w => `
        <div class="warranty-item ${w.isReplacement ? 'replacement' : ''}">
          <div class="w-item-name">
            ${w.isReplacement ? '<span style="color:#eb2f96">🔄</span>' : ''}
            <b>${w.name}</b> <code style="color:#909399;font-size:11px">#${w.code}</code>
          </div>
          <div class="w-item-months ${w.isReplacement ? 'replacement-warranty' : ''}">
            ${w.months} 个月保修
            ${w.isReplacement ? '<span class="tag tag-change" style="margin-left:6px">替代件</span>' : ''}
          </div>
        </div>
      `).join('') || '<div style="color:#909399;font-size:12px">按整体保修期执行</div>';
      return `
        <div class="detailed-warranty">
          <div class="warranty-header">
            <div class="w-icon">🛡️</div>
            <div class="w-info">
              <div class="w-title">整体保修 <b>${order.warranty.months} 个月</b></div>
              <div class="w-desc">${order.warranty.scope || ''}</div>
            </div>
          </div>
          ${order.warranty.items && order.warranty.items.length > 0 ? `
            <div class="warranty-items">
              <div style="color:#606266;font-size:13px;margin-bottom:8px">📦 分项保修期：</div>
              ${items}
            </div>
          ` : ''}
        </div>
      `;
    }
  };

  global.UI = UI;
})(window);
