/* global window, Store, Util, State, UI, Timeline, App, ServicePanel */
(function (global) {

  function runSafely(fn) {
    try { fn(); }
    catch (e) { UI.toast(e.isBiz ? e.message : ('错误：' + e.message), 'error', 4000); }
  }

  const ClientPanel = {

    dashboard() {
      const me = Store.currentRole();
      const mine = Store.orders(o => o.clientId === me.id);
      const pend = mine.filter(o => ['pending','review'].includes(o.status));
      const work = mine.filter(o => ['confirmed','working','change','checking','rework'].includes(o.status));
      const done = mine.filter(o => o.status === 'done');
      return `
        <div class="page-header"><div><h2>客户工作台 · 我的工单</h2>
          <div class="sub">${me.name} · ${me.address}</div></div></div>
        <div class="order-summary-grid">
          <div class="stat-card orange"><div class="num">${pend.length}</div><div class="label">待我确认报价</div></div>
          <div class="stat-card"><div class="num">${work.length}</div><div class="label">施工中 / 待验收</div></div>
          <div class="stat-card green"><div class="num">${done.length}</div><div class="label">已完成</div></div>
          <div class="stat-card"><div class="num">${mine.length}</div><div class="label">总工单</div></div>
        </div>
        <div class="card">
          <div class="card-title">📂 我的全部工单</div>
          ${mine.length ? ServicePanel.orderListView(mine, true) : UI.emptyState('暂无工单，拨打客服热线报修吧！')}
        </div>`;
    },

    listPendingQuote() {
      const me = Store.currentRole();
      const list = Store.orders(o => o.clientId === me.id && ['pending','review'].includes(o.status));
      return `
        <div class="page-header"><div><h2>待我确认报价</h2><div class="sub">共 ${list.length} 条</div></div></div>
        <div class="card">${list.length ? ServicePanel.orderListView(list, true) : UI.emptyState('暂无待确认报价 🎉')}</div>`;
    },

    listPendingAccept() {
      const me = Store.currentRole();
      const list = Store.orders(o => o.clientId === me.id && ['checking'].includes(o.status));
      return `
        <div class="page-header"><div><h2>待验收</h2><div class="sub">共 ${list.length} 条待验收</div></div></div>
        <div class="card">${list.length ? ServicePanel.orderListView(list, true) : UI.emptyState('暂无待验收工单')}</div>`;
    },

    listPendingChange() {
      const me = Store.currentRole();
      const list = Store.orders(o => o.clientId === me.id && o.status === 'change'
        && (o.changeOrders || []).some(c => c.status === 'pending'));
      return `
        <div class="page-header"><div><h2>待确认变更单</h2><div class="sub">施工中追加的报价变更</div></div></div>
        <div class="card">${list.length ? ServicePanel.orderListView(list, true) : UI.emptyState('暂无待确认变更单')}</div>`;
    },

    listHistory() {
      const me = Store.currentRole();
      const list = Store.orders(o => o.clientId === me.id);
      return `
        <div class="page-header"><div><h2>我的工单历史</h2><div class="sub">共 ${list.length} 条</div></div></div>
        <div class="card">${list.length ? ServicePanel.orderListView(list, true) : UI.emptyState('暂无历史工单')}</div>`;
    },

    orderDetail(orderId) {
      const order = Store.getOrder(orderId);
      if (!order) return UI.emptyState('工单不存在');
      const users = Store.users();
      const tech = order.techUserId ? users[order.techUserId] : null;
      const client = users[order.clientId];
      const me = Store.currentRole();
      const mine = order.clientId === me.id;

      const actions = [];
      if (mine && (order.status === 'pending' || order.status === 'review')) {
        if (order.status === 'pending') {
          actions.push(`<button class="btn btn-success btn-lg" onclick="ClientPanel.confirmQuote('${order.id}')">✅ 确认报价（可开工）</button>`);
        }
        actions.push(`<button class="btn btn-danger" onclick="ClientPanel.returnQuote('${order.id}')">↩️ 退回报价</button>`);
      }
      if (mine && order.status === 'checking') {
        actions.push(`<button class="btn btn-success btn-lg" onclick="ClientPanel.acceptOrder('${order.id}')">✅ 验收通过（完成）</button>`);
        actions.push(`<button class="btn btn-danger" onclick="ClientPanel.rejectAccept('${order.id}')">🔧 驳回返修</button>`);
      }
      const pendingChanges = (order.changeOrders || []).filter(c => c.status === 'pending');
      if (mine && order.status === 'change' && pendingChanges.length) {
        actions.push(`<button class="btn btn-warning btn-lg" onclick="ClientPanel.showChangeApproval('${order.id}')">📋 确认变更单（${pendingChanges.length} 条待处理）</button>`);
      }
      actions.push(`<button class="btn btn-secondary" onclick="App.sendMessage('${order.id}')">💬 发消息</button>`);

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
          <div>${actions.join('')}</div>
        </div>

        ${UI.statusBanner(order)}

        ${pendingChanges.length ? `
          <div class="change-panel">
            <h4>⚠️ 有 ${pendingChanges.length} 条变更单等待您的确认</h4>
            <div style="margin-top:8px">
              ${pendingChanges.map(c => `
                <div style="background:#fff;padding:10px 14px;border-radius:6px;margin-bottom:6px;border:1px solid #ffd591">
                  <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">
                    <b>变更单 ${c.id}</b>
                    <span style="color:#fa8c16;font-weight:700">+ ${Util.fmtMoney(c.totalAdd)}</span>
                  </div>
                  <table class="data-table" style="font-size:12px">
                    <thead><tr><th>项目</th><th style="width:100px">金额</th><th>原因</th></tr></thead>
                    <tbody>
                      ${c.items.map(it => `<tr><td>${it.name}</td><td>+${Util.fmtMoney(it.amount)}</td><td>${it.reason}</td></tr>`).join('')}
                    </tbody>
                  </table>
                </div>
              `).join('')}
            </div>
            <div style="margin-top:10px;display:flex;gap:8px">
              <button class="btn btn-success btn-sm" onclick="ClientPanel.approveAllChange('${order.id}')">✅ 全部确认</button>
              <button class="btn btn-danger btn-sm" onclick="ClientPanel.showChangeApproval('${order.id}')">逐条审批</button>
            </div>
          </div>
        ` : ''}

        <div class="card">
          <div class="card-title">基本信息</div>
          <div class="form-grid">
            <div class="field-row"><span class="f-label">报修分类</span><span class="f-value">${order.category}</span></div>
            <div class="field-row"><span class="f-label">报修客户</span><span class="f-value">${client.name}（${client.phone || ''}）</span></div>
            <div class="field-row"><span class="f-label">服务地址</span><span class="f-value">${client.address || '—'}</span></div>
            <div class="field-row"><span class="f-label">指派师傅</span><span class="f-value">${tech ? (tech.name + ' · ' + tech.title) : '未指派'}</span></div>
            <div class="field-row"><span class="f-label">我最初的预算</span><span class="f-value">${Util.fmtMoney(order.customerBudget)}</span></div>
            <div class="field-row"><span class="f-label">客服预估上限</span><span class="f-value"><b style="color:#667eea">${Util.fmtMoney(order.estimateUpper)}</b></span></div>
          </div>
          <div class="divider"></div>
          <div class="section-title">📝 报修描述</div>
          <div style="line-height:1.7;color:#4a5568;background:#fafbfc;padding:12px 16px;border-radius:6px">${order.description}</div>
        </div>

        ${order.survey ? `
        <div class="card">
          <div class="card-title">🏠 师傅上门勘查结果</div>
          <div class="form-grid">
            <div class="field-row"><span class="f-label">勘查时间</span><span class="f-value">${Util.fmtTime(order.survey.visitedAt)}</span></div>
            <div class="field-row"><span class="f-label">勘查师傅</span><span class="f-value">${tech ? tech.name : '—'}</span></div>
            <div class="field-row"><span class="f-label">施工范围</span><span class="f-value">${order.survey.areaSize || '—'}</span></div>
            <div class="field-row"><span class="f-label">难度</span><span class="f-value">${order.survey.difficulty || '—'}</span></div>
          </div>
          <div class="divider"></div>
          <div class="section-title">🔍 故障诊断与方案</div>
          <div style="line-height:1.7;color:#4a5568;background:#f0f9ff;padding:12px 16px;border-radius:6px;white-space:pre-wrap">${order.survey.diagnosis}</div>
        </div>` : ''}

        ${order.materials && order.materials.length ? `
        <div class="card">
          <div class="card-title">📦 材料清单（${Util.fmtMoney(order.pricing.materials)}）</div>
          ${UI.materialsTable(order, false)}
        </div>` : ''}

        ${order.labor && order.labor.length ? `
        <div class="card">
          <div class="card-title">⏱️ 工时项目（${Util.fmtMoney(order.pricing.labor)}）</div>
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
          <div class="divider"></div>
          ${UI.financeOverview(order)}
          <div class="divider"></div>
          ${UI.warrantyBox(order) || '<div style="color:#909399">本项目暂未设置保修承诺</div>'}
        </div>

        ${(order.invoices && order.invoices.length) ? `
        <div class="card">
          <div class="card-title">🧾 发票记录</div>
          <table class="data-table">
            <thead><tr><th>发票号</th><th>开票日期</th><th>金额</th><th>状态</th></tr></thead>
            <tbody>${order.invoices.map(i => `<tr><td>${i.invoiceNo}</td><td>${Util.fmtDate(i.date)}</td><td>${Util.fmtMoney(i.amount)}</td><td><span class="tag tag-success">已开具</span></td></tr>`).join('')}</tbody>
          </table>
        </div>` : ''}

        <div class="card">
          <div class="card-title">📜 完整状态时间线（含沟通记录）</div>
          ${Timeline.render(order)}
        </div>
      `;
    },

    async confirmQuote(orderId) {
      const order = Store.getOrder(orderId);
      const ok = await UI.confirm('确认报价？',
        `<div>您即将确认以下报价，确认后将进入施工安排。</div>
         <div style="margin:12px 0;padding:14px;background:#fafbfc;border-radius:6px">
           <div style="font-weight:600;margin-bottom:6px">${order.title}</div>
           <div><b>报价总额：<span style="font-size:18px;color:#ff4b2b">${Util.fmtMoney(order.pricing.total)}</span></b></div>
           <div style="margin-top:4px;color:#909399">预估上限：${Util.fmtMoney(order.estimateUpper)} · 保修：${order.warranty.months ? order.warranty.months + ' 个月' : '无'}</div>
         </div>
         <div style="color:#ad4e00">⚠️ 确认后，<b>师傅一旦开工报价即锁价</b>，后续任何增项都将走变更单。</div>`,
        '✅ 我已阅读并确认报价', '再想想');
      if (!ok) return;
      runSafely(() => {
        State.clientConfirm(orderId);
        UI.toast('报价已确认，等待师傅开工', 'success');
        App.router.refresh();
      });
    },

    async returnQuote(orderId) {
      const reason = await UI.prompt('退回报价', {
        label: '请填写退回原因（≥5 个字，师傅将据此修改后重报）：',
        multiline: true, rows: 4, required: true,
        placeholder: '如：材料缺少品牌规格、价格过高、工时计算不合理、漏报某项目...'
      });
      if (reason === null) return;
      runSafely(() => {
        State.clientReturn(orderId, reason);
        UI.toast('报价已退回，请等待师傅重报', 'warning');
        App.router.refresh();
      });
    },

    async acceptOrder(orderId) {
      const note = await UI.prompt('验收确认', {
        label: '验收通过！请简要填写验收意见（可空）：',
        multiline: true, rows: 2, required: false,
        default: '施工质量合格，符合预期，同意验收。'
      });
      if (note === null) return;
      runSafely(() => {
        State.acceptOrder(orderId, note);
        UI.toast('🎉 验收通过，工单完成！', 'success', 3000);
        App.router.refresh();
      });
    },

    async rejectAccept(orderId) {
      const reason = await UI.prompt('驳回验收 / 要求返修', {
        label: '请填写返修原因（≥5 个字）：',
        multiline: true, rows: 3, required: true,
        placeholder: '如：漏水问题未解决、还有异响、打扫不彻底...'
      });
      if (reason === null) return;
      runSafely(() => {
        State.rejectAccept(orderId, reason);
        UI.toast('已提交返修要求，师傅将尽快上门处理', 'warning');
        App.router.refresh();
      });
    },

    async approveAllChange(orderId) {
      const order = Store.getOrder(orderId);
      const pending = (order.changeOrders || []).filter(c => c.status === 'pending');
      const total = pending.reduce((s, c) => s + c.totalAdd, 0);
      const ok = await UI.confirm('批量确认变更单？',
        `<div>共 ${pending.length} 条变更单待确认，合计追加 <b style="font-size:18px;color:#fa8c16">+${Util.fmtMoney(total)}</b>。</div>
         <div style="margin-top:8px">确认后将自动加总到报价总额并继续施工。</div>`,
        '✅ 全部确认', '逐条审批');
      if (!ok) return;
      runSafely(() => {
        pending.forEach(c => State.approveChange(orderId, c.id, true));
        UI.toast(`已确认 ${pending.length} 条变更`, 'success');
        App.router.refresh();
      });
    },

    showChangeApproval(orderId) {
      const order = Store.getOrder(orderId);
      const pending = (order.changeOrders || []).filter(c => c.status === 'pending');
      if (!pending.length) { UI.toast('当前没有待审批的变更单'); return; }
      let idx = 0;
      const renderOne = () => {
        const c = pending[idx];
        if (!c) { UI.toast('所有变更单处理完毕', 'success'); m.close(); App.router.refresh(); return; }
        m.setBody(`
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">
            <b>变更单 ${c.id}（${idx + 1}/${pending.length}）</b>
            <span style="font-size:18px;font-weight:700;color:#fa8c16">+ ${Util.fmtMoney(c.totalAdd)}</span>
          </div>
          <div style="padding:12px;background:#fff7e6;border-radius:6px;margin-bottom:12px">
            <div style="color:#ad4e00;font-size:12px;margin-bottom:6px">提交时间：${Util.fmtTime(c.createdAt)}</div>
            <table class="data-table">
              <thead><tr><th>项目</th><th style="width:100px">金额</th><th>原因</th></tr></thead>
              <tbody>
                ${c.items.map(it => `<tr><td>${it.name}</td><td>+${Util.fmtMoney(it.amount)}</td><td>${it.reason}</td></tr>`).join('')}
              </tbody>
            </table>
          </div>
          <div style="color:#606266;font-size:13px">
            变更批准后，以上金额将计入报价总额。请仔细核对是否与施工内容一致。
          </div>`);
        m.setFooter(`
          <button class="btn btn-secondary" onclick="window.__caSkip && window.__caSkip()">稍后处理</button>
          <button class="btn btn-danger" id="ca-reject">驳回</button>
          <button class="btn btn-success" id="ca-approve">✅ 确认此变更</button>
        `);
        bindFooter();
      };
      const bindFooter = () => {
        m.footer.querySelector('#ca-approve').onclick = async () => {
          runSafely(() => { State.approveChange(orderId, pending[idx].id, true); });
          idx++; renderOne();
        };
        m.footer.querySelector('#ca-reject').onclick = async () => {
          const r = await UI.prompt('驳回该变更单', {
            label: '请填写驳回原因（≥5 字）', multiline: true, rows: 2, required: true,
            placeholder: '如：价格过高、项目不合理...'
          });
          if (r === null) return;
          runSafely(() => { State.approveChange(orderId, pending[idx].id, false, r); });
          idx++; renderOne();
        };
      };
      const m = UI.openModal({
        title: '📋 变更单审批 · ' + order.id,
        body: '', footer: '', width: 720
      });
      window.__caSkip = () => m.close();
      renderOne();
    }
  };

  global.ClientPanel = ClientPanel;
})(window);
