/* global window, Store, Util, State, UI, Timeline, App */
(function (global) {

  function runSafely(fn) {
    try { fn(); }
    catch (e) { UI.toast(e.isBiz ? e.message : ('错误：' + e.message), 'error', 3500); }
  }

  const ServicePanel = {

    dashboard() {
      const me = Store.currentRole();
      const all = Store.orders();
      const stats = {
        total: all.length,
        draft: all.filter(o => o.status === 'draft').length,
        pending: all.filter(o => ['pending','review','returned','confirmed'].includes(o.status)).length,
        working: all.filter(o => ['working','change','checking','rework'].includes(o.status)).length,
        done: all.filter(o => o.status === 'done').length
      };
      const recent = all.slice().sort((a, b) => b.createdAt - a.createdAt).slice(0, 6);
      return `
        <div class="page-header">
          <div><h2>客服工作台 · 概览</h2><div class="sub">${me.name}（${me.title}）</div></div>
          <button class="btn btn-primary btn-lg" onclick="ServicePanel.newOrderModal()">＋ 新建报修需求</button>
        </div>
        <div class="order-summary-grid">
          <div class="stat-card"><div class="num">${stats.total}</div><div class="label">总工单数</div></div>
          <div class="stat-card orange"><div class="num">${stats.draft + stats.pending}</div><div class="label">待处理（待派单+待确认）</div></div>
          <div class="stat-card"><div class="num">${stats.working}</div><div class="label">施工中 / 待验收</div></div>
          <div class="stat-card green"><div class="num">${stats.done}</div><div class="label">已完成归档</div></div>
        </div>
        <div class="card">
          <div class="card-title">最近工单</div>
          ${recent.length ? ServicePanel.orderListView(recent, true) : UI.emptyState('暂无工单，点击右上角新建')}
        </div>
        <div class="card">
          <div class="card-title">🎯 演示场景说明</div>
          <div style="line-height:1.9;color:#4a5568;font-size:13px">
            <b>① 多人派单：</b>在「待派单列表」中分别指派给 <code>李师傅</code> 或 <code>张师傅</code>，切换到对应师傅角色即可看到各自工单。<br>
            <b>② 超预估复核：</b>报价单 Q20260614-003 已超出预估上限（900→1280），切换到 <code>赵会计（财务）</code> 角色即可复核通过/驳回。<br>
            <b>③ 退回重报：</b>报价单 Q20260614-005 已被陈女士退回缺少滑轮材料明细，切换到 <code>张师傅</code> 角色可补全后重报。<br>
            <b>④ 开工锁价拦截：</b>报价单 Q20260614-001 已开工（🔒），尝试修改报价会被拦截，只能走变更单。<br>
            <b>⑤ 追加报价闭环：</b>报价单 Q20260614-004 已完成全流程（含追加变更单、验收、发票、收款），可查看时间线。
          </div>
        </div>`;
    },

    orderListView(orders, withAction = true) {
      const users = Store.users();
      const rows = orders.map(o => {
        const s = Util.statusLabel(o.status);
        const tech = o.techUserId ? users[o.techUserId] : null;
        const client = users[o.clientId];
        const over = (o.pricing.total > o.estimateUpper);
        const actions = [];
        if (o.status === 'draft') {
          actions.push(`<button class="btn btn-primary btn-sm" onclick="ServicePanel.assignModal('${o.id}')">指派师傅</button>`);
        }
        if (withAction) {
          actions.push(`<button class="btn btn-secondary btn-sm" onclick="App.openOrder('${o.id}')">查看详情</button>`);
        }
        return `<div class="list-item">
          <div class="li-head">
            <div>
              <div class="li-title">
                <code style="color:#667eea;font-size:12px;margin-right:8px">${o.id}</code>
                ${o.title}
                <span class="tag ${s.cls}" style="margin-left:8px">${s.text}</span>
                ${o.priceLocked ? '<span style="margin-left:4px" title="已开工锁价">🔒</span>' : ''}
                ${over ? '<span class="tag tag-return" style="margin-left:4px" title="超出预估上限">⚠️ 超预估</span>' : ''}
              </div>
              <div class="li-meta">
                ${o.category} · 客户：${client.name}（${client.address || ''}）
                · 师傅：${tech ? tech.name : '未指派'}
                · 创建于 ${Util.fmtTime(o.createdAt)}
              </div>
            </div>
            <div class="li-amount">${o.pricing.total ? Util.fmtMoney(o.pricing.total) : '未报价'}
              <div style="text-align:right;font-weight:400;font-size:11px;color:#909399">
                预估上限：${Util.fmtMoney(o.estimateUpper)}
              </div>
            </div>
          </div>
          <div class="li-body">${o.description}</div>
          ${actions.length ? `<div class="li-actions">${actions.join('')}</div>` : ''}
        </div>`;
      }).join('');
      return rows;
    },

    listDraft() {
      const list = Store.orders(o => o.status === 'draft');
      return `
        <div class="page-header"><div><h2>待派单列表</h2>
          <div class="sub">新建报修单，尚未指派师傅。共 ${list.length} 条。</div></div>
          <button class="btn btn-primary" onclick="ServicePanel.newOrderModal()">＋ 新建需求</button>
        </div>
        <div class="card">
          ${list.length ? ServicePanel.orderListView(list, true) : UI.emptyState('所有工单均已派单，干得漂亮！', '🎉')}
        </div>`;
    },

    listActive() {
      const list = Store.orders(o => ['assigned','surveying','priced','review','pending','returned','confirmed'].includes(o.status));
      return `
        <div class="page-header"><div><h2>处理中工单</h2>
          <div class="sub">勘查、报价、确认阶段。共 ${list.length} 条。</div></div></div>
        <div class="card">
          ${list.length ? ServicePanel.orderListView(list, true) : UI.emptyState('当前没有处理中的工单')}
        </div>`;
    },

    listWorking() {
      const list = Store.orders(o => ['working','change','checking','rework'].includes(o.status));
      return `
        <div class="page-header"><div><h2>施工中 / 验收中</h2>
          <div class="sub">已开工，不可随意改价，只能走变更单。共 ${list.length} 条。</div></div></div>
        <div class="card">
          ${list.length ? ServicePanel.orderListView(list, true) : UI.emptyState('暂无施工中工单')}
        </div>`;
    },

    listDone() {
      const list = Store.orders(o => o.status === 'done');
      return `
        <div class="page-header"><div><h2>已归档工单</h2>
          <div class="sub">已验收、收款开票完成。共 ${list.length} 条。</div></div></div>
        <div class="card">
          ${list.length ? ServicePanel.orderListView(list, true) : UI.emptyState('还没有完成的工单')}
        </div>`;
    },

    listAll() {
      const list = Store.orders();
      return `
        <div class="page-header"><div><h2>全部工单</h2><div class="sub">查看所有历史工单。</div></div></div>
        <div class="card">
          ${list.length ? ServicePanel.orderListView(list, true) : UI.emptyState('暂无工单')}
        </div>`;
    },

    orderDetail(orderId) {
      const order = Store.getOrder(orderId);
      if (!order) return UI.emptyState('工单不存在');
      const users = Store.users();
      const tech = order.techUserId ? users[order.techUserId] : null;
      const client = users[order.clientId];
      return `
        <div class="page-header">
          <div>
            <h2>
              <button class="btn btn-secondary btn-sm" onclick="App.router.back()" style="margin-right:10px">← 返回</button>
              工单详情 · ${order.title}
              <span class="tag ${Util.statusLabel(order.status).cls}" style="margin-left:10px">${Util.statusLabel(order.status).text}</span>
              ${order.priceLocked ? '<span title="已开工锁价" style="margin-left:6px">🔒</span>' : ''}
            </h2>
            <div class="sub"><code>${order.id}</code> · 创建于 ${Util.fmtTime(order.createdAt)}</div>
          </div>
          <div>
            ${order.status === 'draft' ? `<button class="btn btn-primary" onclick="ServicePanel.assignModal('${order.id}')">指派师傅</button>` : ''}
            <button class="btn btn-secondary" onclick="App.sendMessage('${order.id}')">💬 发消息</button>
          </div>
        </div>

        ${UI.statusBanner(order)}

        <div class="card">
          <div class="card-title">基本信息</div>
          <div class="form-grid">
            <div class="field-row"><span class="f-label">报修分类</span><span class="f-value">${order.category}</span></div>
            <div class="field-row"><span class="f-label">报修客户</span><span class="f-value">${client.name}（${client.phone || ''}）</span></div>
            <div class="field-row"><span class="f-label">服务地址</span><span class="f-value">${client.address || '—'}</span></div>
            <div class="field-row"><span class="f-label">指派师傅</span><span class="f-value">${tech ? (tech.name + ' · ' + tech.title) : '未指派'}</span></div>
            <div class="field-row"><span class="f-label">客户心理价</span><span class="f-value">${Util.fmtMoney(order.customerBudget)}</span></div>
            <div class="field-row"><span class="f-label">客服预估上限</span><span class="f-value"><b style="color:#667eea">${Util.fmtMoney(order.estimateUpper)}</b></span></div>
          </div>
          <div class="divider"></div>
          <div class="section-title">📝 客户描述</div>
          <div style="line-height:1.7;color:#4a5568;background:#fafbfc;padding:12px 16px;border-radius:6px">${order.description}</div>
        </div>

        ${order.survey ? `
        <div class="card">
          <div class="card-title">🏠 上门勘查结果</div>
          <div class="form-grid">
            <div class="field-row"><span class="f-label">勘查时间</span><span class="f-value">${Util.fmtTime(order.survey.visitedAt)}</span></div>
            <div class="field-row"><span class="f-label">勘查师傅</span><span class="f-value">${tech ? tech.name : '—'}</span></div>
            <div class="field-row"><span class="f-label">施工范围</span><span class="f-value">${order.survey.areaSize || '—'}</span></div>
            <div class="field-row"><span class="f-label">难度</span><span class="f-value">${order.survey.difficulty || '—'}</span></div>
          </div>
          <div class="divider"></div>
          <div class="section-title">🔍 故障诊断</div>
          <div style="line-height:1.7;color:#4a5568;background:#f0f9ff;padding:12px 16px;border-radius:6px;white-space:pre-wrap">${order.survey.diagnosis}</div>
        </div>` : ''}

        ${order.materials && order.materials.length ? `
        <div class="card">
          <div class="card-title">📦 材料清单</div>
          ${UI.materialsTable(order, false)}
        </div>` : ''}

        ${order.labor && order.labor.length ? `
        <div class="card">
          <div class="card-title">⏱️ 工时与单价</div>
          ${UI.laborTable(order, false)}
        </div>` : ''}

        ${order.addItems && order.addItems.length ? `
        <div class="card">
          <div class="card-title">➕ 追加 / 变更项</div>
          ${UI.addItemsTable(order.addItems, order.changeOrders)}
        </div>` : ''}

        <div class="card">
          <div class="card-title">💰 报价明细（总额 ${Util.fmtMoney(order.pricing.total)}）</div>
          ${UI.pricingBreakdown(order)}
          ${UI.warrantyBox(order)}
        </div>

        ${order.deposit > 0 || (order.invoices && order.invoices.length) ? `
        <div class="card">
          <div class="card-title">🧾 财务概览</div>
          ${UI.financeOverview(order)}
          ${(order.invoices && order.invoices.length) ? `
            <div class="divider"></div>
            <div class="section-title">发票记录</div>
            <table class="data-table">
              <thead><tr><th>发票号</th><th>开票日期</th><th>金额</th><th>状态</th></tr></thead>
              <tbody>${order.invoices.map(i => `<tr><td>${i.invoiceNo}</td><td>${Util.fmtDate(i.date)}</td><td>${Util.fmtMoney(i.amount)}</td><td><span class="tag tag-success">已开具</span></td></tr>`).join('')}</tbody>
            </table>` : ''}
        </div>` : ''}

        <div class="card">
          <div class="card-title">📜 状态时间线</div>
          ${Timeline.render(order)}
        </div>
      `;
    },

    newOrderModal() {
      const users = Store.users();
      const clients = Object.values(users).filter(u => u.role === 'client');
      const techs = Object.values(users).filter(u => u.role === 'tech');
      const categories = ['水电维修', '水暖维修', '家电维修', '电路维修', '门窗维修', '疏通/防水', '空调维修', '其他'];
      const body = `
        <div class="form-grid">
          <div class="form-row">
            <label><span class="req">*</span>报修客户</label>
            <select id="f-client">
              ${clients.map(c => `<option value="${c.id}">${c.name}（${c.address || c.phone || ''}）</option>`).join('')}
            </select>
          </div>
          <div class="form-row">
            <label><span class="req">*</span>报修分类</label>
            <select id="f-cat">${categories.map(c => `<option>${c}</option>`).join('')}</select>
          </div>
        </div>
        <div class="form-row">
          <label><span class="req">*</span>需求标题（简要概述）</label>
          <input id="f-title" placeholder="例如：卫生间漏水、空调不制冷、厨房插座无电..." />
        </div>
        <div class="form-row">
          <label><span class="req">*</span>详细描述</label>
          <textarea id="f-desc" rows="4" placeholder="请详细描述故障现象、发生时间、客户要求等..."></textarea>
        </div>
        <div class="form-grid">
          <div class="form-row">
            <label>客户心理价（客户告知的大致预算）</label>
            <input id="f-budget" type="number" min="0" step="10" value="500" />
          </div>
          <div class="form-row">
            <label><span class="req">*</span>客服预估上限（超此金额需走复核）</label>
            <input id="f-upper" type="number" min="0" step="10" value="800" />
          </div>
        </div>
        <div class="form-row">
          <label>立即指派师傅（可稍后派单）</label>
          <select id="f-tech">
            <option value="">暂不派单</option>
            ${techs.map(t => `<option value="${t.id}">${t.name}（${t.title}）</option>`).join('')}
          </select>
        </div>
      `;
      const footer = `
        <button class="btn btn-secondary" onclick="window.__newOrderModal && window.__newOrderModal.close()">取消</button>
        <button class="btn btn-primary" id="f-submit">创建需求</button>
      `;
      const m = UI.openModal({ title: '📝 新建报修需求', body, footer, width: 640 });
      window.__newOrderModal = m;
      m.el.querySelector('#f-submit').onclick = () => runSafely(() => {
        const title = m.el.querySelector('#f-title').value.trim();
        const desc = m.el.querySelector('#f-desc').value.trim();
        const clientId = m.el.querySelector('#f-client').value;
        const cat = m.el.querySelector('#f-cat').value;
        const budget = Number(m.el.querySelector('#f-budget').value || 0);
        const upper = Number(m.el.querySelector('#f-upper').value || 0);
        const techId = m.el.querySelector('#f-tech').value;
        if (!title) return UI.toast('请填写需求标题', 'warning');
        if (!desc) return UI.toast('请填写详细描述', 'warning');
        if (!upper) return UI.toast('请填写预估上限', 'warning');
        const order = {
          id: Store.newOrderId(),
          createdAt: Date.now(),
          clientId, category: cat, title, description: desc,
          customerBudget: budget, estimateUpper: upper,
          serviceUserId: Store.currentRole().id,
          techUserId: techId || null,
          status: techId ? 'assigned' : 'draft',
          priceLocked: false,
          survey: null, materials: [], labor: [], visitFee: 0, addItems: [],
          warranty: { months: 0, scope: '' },
          pricing: { materials: 0, labor: 0, visit: 0, subtotal: 0, discount: 0, total: 0 },
          timeline: [{
            type: 'status', sub: 'created', title: '客服创建需求',
            content: `创建新需求：${title}。客户预算 ${Util.fmtMoney(budget)}，预估上限 ${Util.fmtMoney(upper)}。`,
            time: Date.now(), userId: Store.currentRole().id
          }],
          changeOrders: [], invoices: [], deposit: 0, reworkCount: 0
        };
        if (techId) {
          const t = Store.users()[techId];
          order.timeline.push({
            type: 'status', sub: 'assigned', title: '派单',
            content: `已指派给 ${t.name}。`, time: Date.now(), userId: Store.currentRole().id,
            meta: [{ k: '派给', v: t.name }]
          });
        }
        Store.saveOrder(order);
        UI.toast(`需求已创建：${order.id}`, 'success');
        m.close();
        App.router.refresh();
      });
    },

    assignModal(orderId) {
      const order = Store.getOrder(orderId);
      if (!order) return;
      const users = Store.users();
      const techs = Object.values(users).filter(u => u.role === 'tech');
      const body = `
        <div class="form-row">
          <label>当前工单：<b>${order.title}</b> <code>${order.id}</code></label>
        </div>
        <div class="form-row">
          <label><span class="req">*</span>选择师傅</label>
          <select id="a-tech">
            ${techs.map(t => `<option value="${t.id}" ${order.techUserId === t.id ? 'selected' : ''}>${t.name}（${t.title}）</option>`).join('')}
          </select>
        </div>
      `;
      const footer = `
        <button class="btn btn-secondary" onclick="window.__assignModal && window.__assignModal.close()">取消</button>
        <button class="btn btn-primary" id="a-submit">确认派单</button>
      `;
      const m = UI.openModal({ title: '🎯 派单 · 选择师傅', body, footer, width: 440 });
      window.__assignModal = m;
      m.el.querySelector('#a-submit').onclick = () => runSafely(() => {
        const techId = m.el.querySelector('#a-tech').value;
        State.assignOrder(orderId, techId);
        UI.toast('派单成功', 'success');
        m.close();
        App.router.refresh();
      });
    },

    assignBadge() { return Store.orders(o => o.status === 'draft').length; }
  };

  global.ServicePanel = ServicePanel;
})(window);
