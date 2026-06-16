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
          if (order.phases && order.phases.length > 0) {
            actions.push(`<button class="btn btn-info btn-lg" onclick="ClientPanel.partialConfirmModal('${order.id}')">☑️ 项目级确认</button>`);
          }
          actions.push(`<button class="btn btn-success btn-lg" onclick="ClientPanel.confirmQuote('${order.id}')">✅ 全部确认（可开工）</button>`);
        }
        actions.push(`<button class="btn btn-danger" onclick="ClientPanel.returnQuote('${order.id}')">↩️ 退回报价</button>`);
      }
      if (mine && order.status === 'returned') {
        actions.push(`<button class="btn btn-info" onclick="ClientPanel.viewReturnedNote('${order.id}')">📝 查看退回意见</button>`);
        actions.push(`<button class="btn btn-secondary" onclick="ClientPanel.waitForRequote('${order.id}')">⏳ 等待重报</button>`);
      }
      if (mine && order.status === 'checking') {
        if (order.phases && order.phases.length > 0) {
          actions.push(`<button class="btn btn-info btn-lg" onclick="ClientPanel.phaseAcceptModal('${order.id}')">📊 分阶段验收</button>`);
        }
        actions.push(`<button class="btn btn-success btn-lg" onclick="ClientPanel.acceptOrder('${order.id}')">✅ 整体验收通过</button>`);
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

        ${order.phases && order.phases.length > 0 ? `
        <div class="card">
          <div class="card-title">📊 分阶段验收进度</div>
          ${UI.phaseProgress(order.phases)}
          <div class="divider"></div>
          <div class="card-title">☑️ 项目级确认状态</div>
          ${UI.itemConfirmTable(order.phases, { editable: false })}
        </div>` : ''}

        ${order.survey && order.survey.photos && order.survey.photos.length > 0 ? `
        <div class="card">
          <div class="card-title">📷 勘查照片</div>
          ${UI.photoWall(order.survey.photos)}
        </div>` : ''}

        ${order.changeOrders && order.changeOrders.length > 0 ? `
        <div class="card">
          <div class="card-title">📋 变更单详情</div>
          ${order.changeOrders.map(co => `
            <div class="change-panel" style="margin-bottom:16px">
              <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">
                <div>
                  <b>变更单 #${co.id}</b>
                  <span class="tag ${co.status === 'approved' ? 'tag-success' : co.status === 'rejected' ? 'tag-return' : 'tag-pending'}" style="margin-left:8px">
                    ${co.status === 'approved' ? '已确认' : co.status === 'rejected' ? '已驳回' : '待确认'}
                  </span>
                  ${co.type === 'hidden_mod' ? '<span class="tag tag-info" style="margin-left:6px">隐蔽工程</span>' : ''}
                  ${co.type === 'structure' ? '<span class="tag tag-info" style="margin-left:6px">结构问题</span>' : ''}
                  ${co.type === 'replacement' ? '<span class="tag tag-change" style="margin-left:6px">替代件</span>' : ''}
                </div>
                <div style="color:#fa8c16;font-weight:600">+ ${Util.fmtMoney(co.totalAdd)}</div>
              </div>
              ${co.diagnosis ? `<div style="background:#fffbe6;padding:8px 12px;border-radius:6px;font-size:13px;color:#ad4e00;margin-bottom:10px">📝 ${co.diagnosis}</div>` : ''}
              <table class="data-table" style="margin-bottom:10px">
                <thead><tr><th>变更项目</th><th style="width:100px">金额</th><th>变更原因</th></tr></thead>
                <tbody>
                  ${co.items.map(it => `
                    <tr>
                      <td>${it.name}${it.isReplacement ? '<span class="tag tag-change" style="margin-left:6px">替代件</span>' : ''}</td>
                      <td style="font-weight:600;color:#fa8c16">+ ${Util.fmtMoney(it.amount)}</td>
                      <td>${it.reason}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
              ${co.photos && co.photos.length > 0 ? `<div style="margin-top:10px"><div style="color:#606266;font-size:12px;margin-bottom:6px">📷 变更佐证照片 (${co.photos.length}张)</div>${UI.photoWall(co.photos)}</div>` : ''}
              <div style="color:#909399;font-size:12px;margin-top:8px">
                提交时间：${Util.fmtTime(co.createdAt)}
                ${co.approvedAt ? ` · 客户确认时间：${Util.fmtTime(co.approvedAt)}` : ''}
              </div>
            </div>
          `).join('')}
        </div>` : ''}

        ${order.addItems && order.addItems.length ? `
        <div class="card">
          <div class="card-title">➕ 追加 / 变更项</div>
          ${UI.addItemsTable(order.addItems, order.changeOrders)}
        </div>` : ''}

        ${order.feeAdjustments && order.feeAdjustments.length > 0 ? `
        <div class="card">
          <div class="card-title">💱 费用调整记录</div>
          ${UI.feeAdjustmentsPanel(order.feeAdjustments)}
        </div>` : ''}

        <div class="card">
          <div class="card-title">💰 报价明细（总额 ${Util.fmtMoney(order.pricing.total)}）</div>
          ${UI.pricingBreakdown(order)}
          <div class="divider"></div>
          ${order.materials && order.materials.some(m => m.feeType) ? `
            <div class="card-title">🏷️ 费用类型标记</div>
            <div style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:12px">
              ${order.materials.filter(m => m.feeType).map(m => UI.feeTypeTag(m.feeType)).join('')}
              ${order.labor && order.labor.filter(l => l.feeType).map(l => UI.feeTypeTag(l.feeType)).join('')}
              ${order.addItems && order.addItems.filter(a => a.feeType).map(a => UI.feeTypeTag(a.feeType, a.amount)).join('')}
            </div>
            <div class="divider"></div>
          ` : ''}
          ${UI.financeOverview(order)}
          <div class="divider"></div>
          ${UI.detailedWarrantyBox(order) || UI.warrantyBox(order) || '<div style="color:#909399">本项目暂未设置保修承诺</div>'}
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
        const photosHtml = c.photos && c.photos.length > 0 ? UI.photoWall(c.photos) : '';
        m.setBody(`
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">
            <b>变更单 ${c.id}（${idx + 1}/${pending.length}）</b>
            <span style="font-size:18px;font-weight:700;color:#fa8c16">+ ${Util.fmtMoney(c.totalAdd)}</span>
          </div>
          ${c.diagnosis ? `<div style="background:#fffbe6;padding:8px 12px;border-radius:6px;font-size:13px;color:#ad4e00;margin-bottom:12px">📝 ${c.diagnosis}</div>` : ''}
          <div style="padding:12px;background:#fff7e6;border-radius:6px;margin-bottom:12px">
            <div style="color:#ad4e00;font-size:12px;margin-bottom:6px">提交时间：${Util.fmtTime(c.createdAt)}</div>
            <table class="data-table" style="margin-bottom:10px">
              <thead><tr><th>项目</th><th style="width:100px">金额</th><th>原因</th></tr></thead>
              <tbody>
                ${c.items.map(it => `<tr><td>${it.name}${it.isReplacement ? '<span class="tag tag-change" style="margin-left:6px">替代件</span>' : ''}</td><td>+${Util.fmtMoney(it.amount)}</td><td>${it.reason}</td></tr>`).join('')}
              </tbody>
            </table>
            ${photosHtml ? `<div style="margin-top:10px"><div style="color:#606266;font-size:12px;margin-bottom:6px">📷 变更佐证照片 (${c.photos.length}张)</div>${photosHtml}</div>` : ''}
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
        body: '', footer: '', width: 800, className: 'modal-lg'
      });
      window.__caSkip = () => m.close();
      renderOne();
    },

    partialConfirmModal(orderId) {
      runSafely(() => {
        const order = Store.getOrder(orderId);
        const phases = Store.getPhases(orderId);
        if (!phases || phases.length === 0) {
          UI.toast('该工单未设置分阶段', 'warning');
          return;
        }

        const renderBody = () => {
          const confirmTableHtml = UI.itemConfirmTable(phases, { editable: true });
          const confirmedCount = (phases || []).reduce((s, p) => s + (p.items || []).filter(it => it.confirmed).length, 0);
          const totalCount = (phases || []).reduce((s, p) => s + (p.items || []).length, 0);

          return `
            <div class="status-banner info">
              💡 您可以只确认部分项目。<b>已确认的项目允许开工</b>，未确认的项目将被 🔒 锁定，不能施工。
            </div>
            <div style="margin-bottom:16px;padding:12px 16px;background:#f0f5ff;border-radius:8px">
              <div style="display:flex;justify-content:space-between;align-items:center">
                <div>
                  已选择 <b style="color:#1890ff;font-size:16px">${confirmedCount}</b> / ${totalCount} 项
                  ${confirmedCount < totalCount ? `<span style="color:#fa8c16;margin-left:12px">⚠️ ${totalCount - confirmedCount} 项未确认，将被锁定</span>` : ''}
                </div>
                <div style="color:#52c41a">
                  已确认金额：<b>${Util.fmtMoney((phases || []).reduce((s, p) => s + (p.items || []).filter(it => it.confirmed).reduce((s2, it) => s2 + Number(it.amount || 0), 0), 0))}</b>
                </div>
              </div>
            </div>
            ${confirmTableHtml}
          `;
        };

        const footer = `
          <button class="btn btn-secondary" data-close>取消</button>
          <button class="btn btn-success" id="pc-submit">☑️ 确认所选项目</button>
        `;
        const m = UI.openModal({ title: '☑️ 项目级部分确认 · ' + order.id, body: renderBody(), footer, width: 900, className: 'modal-lg' });

        const bind = () => {
          m.body.querySelectorAll('.select-all-btn').forEach(btn => {
            btn.onclick = () => {
              m.body.querySelectorAll('.item-confirm-check:not(:disabled)').forEach(cb => cb.checked = true);
            };
          });
          m.body.querySelectorAll('.clear-all-btn').forEach(btn => {
            btn.onclick = () => {
              m.body.querySelectorAll('.item-confirm-check:not(:disabled)').forEach(cb => cb.checked = false);
            };
          });
          m.body.querySelectorAll('[data-close]').forEach(b => b.onclick = () => m.close());
        };
        bind();

        m.el.querySelector('#pc-submit').onclick = async () => {
          const checkedIds = Array.from(m.body.querySelectorAll('.item-confirm-check:checked')).map(cb => cb.getAttribute('data-id'));
          if (checkedIds.length === 0) {
            UI.toast('请至少选择一项', 'warning');
            return;
          }
          const allCount = m.body.querySelectorAll('.item-confirm-check').length;
          const note = await UI.prompt('确认备注（可选）', {
            label: `您确认了 ${checkedIds.length}/${allCount} 项，是否有需要说明的？`,
            multiline: true,
            rows: 2,
            required: false,
            placeholder: '如：先确认拆除阶段，隐蔽工程待查看后再确认...'
          });
          if (note === null) return;
          runSafely(() => {
            State.confirmPartialItems(orderId, checkedIds, note);
            UI.toast(`已确认 ${checkedIds.length} 项，未确认项目已锁定`, 'success', 3000);
            m.close();
            App.router.refresh();
          });
        };
      });
    },

    phaseAcceptModal(orderId) {
      runSafely(() => {
        const order = Store.getOrder(orderId);
        const phases = Store.getPhases(orderId);
        if (!phases || phases.length === 0) {
          UI.toast('该工单未设置分阶段', 'warning');
          return;
        }

        const renderBody = () => {
          const phasesHtml = phases.map((p, idx) => {
            const canAccept = p.status === 'done';
            const items = p.items || [];
            const confirmedItems = items.filter(it => it.confirmed && !it.accepted);
            return `
              <div class="phase-card ${p.status}">
                <div class="phase-card-header">
                  <div>
                    <span class="phase-num">${idx + 1}</span>
                    <b style="font-size:15px">${p.name}</b>
                    <span class="tag ${Store.getPhaseStatusLabel(p.status).cls}" style="margin-left:8px">${Store.getPhaseStatusLabel(p.status).text}</span>
                  </div>
                  <div>
                    ${canAccept ? `<button class="btn btn-success btn-sm accept-phase-btn" data-phase="${p.key}">✓ 验收此阶段</button>` : ''}
                  </div>
                </div>
                <div style="color:#606266;font-size:13px;margin:8px 0">${p.desc || ''}</div>
                ${items.length > 0 ? `
                  <table class="data-table" style="font-size:13px;margin-top:10px">
                    <thead><tr>
                      <th style="width:30px"></th>
                      <th>项目名称</th>
                      <th style="width:100px;text-align:right">金额</th>
                      <th style="width:80px">状态</th>
                    </tr></thead>
                    <tbody>
                      ${items.map(it => `
                        <tr class="${it.accepted ? 'accepted-row' : ''} ${it.confirmed ? '' : 'unconfirmed-row'}">
                          <td>${it.accepted ? '✅' : it.confirmed ? '☑️' : '⬜'}</td>
                          <td>${it.name}${it.isChange ? '<span class="tag tag-change" style="margin-left:6px">变更</span>' : ''}${it.reason ? `<div style="color:#909399;font-size:11px">📝 ${it.reason}</div>` : ''}</td>
                          <td style="text-align:right">${Util.fmtMoney(it.amount)}</td>
                          <td>${it.accepted ? '<span class="tag tag-success">已验收</span>' : it.confirmed ? '<span class="tag tag-pending">待验收</span>' : '<span class="tag tag-draft">未确认</span>'}</td>
                        </tr>
                      `).join('')}
                    </tbody>
                  </table>
                ` : ''}
                ${p.acceptedAt ? `<div style="color:#52c41a;font-size:12px;margin-top:8px">✅ 验收通过：${Util.fmtTime(p.acceptedAt)}</div>` : ''}
                ${p.completedAt ? `<div style="color:#1890ff;font-size:12px;margin-top:4px">📌 提交验收：${Util.fmtTime(p.completedAt)}</div>` : ''}
              </div>
            `;
          }).join('');

          return `
            ${UI.phaseProgress(phases)}
            <div class="divider"></div>
            <div class="section-title">📋 分阶段验收</div>
            <div class="phase-cards">
              ${phasesHtml}
            </div>
          `;
        };

        const footer = `
          <button class="btn btn-secondary" data-close>关闭</button>
        `;
        const m = UI.openModal({ title: '📊 分阶段验收 · ' + order.id, body: renderBody(), footer, width: 1000, className: 'modal-xl' });

        const bind = () => {
          m.body.querySelectorAll('.accept-phase-btn').forEach(btn => {
            btn.onclick = async () => {
              const phaseKey = btn.getAttribute('data-phase');
              const phase = phases.find(p => p.key === phaseKey);
              const itemIds = (phase.items || []).filter(it => it.confirmed && !it.accepted).map(it => it.id);
              if (itemIds.length === 0) {
                UI.toast('该阶段没有待验收的项目', 'warning');
                return;
              }
              const ok = await UI.confirm('阶段验收确认',
                `<div>确认 <b>${phase.name}</b> 验收通过？</div>
                 <div style="margin-top:8px;color:#52c41a">✅ 将验收通过 ${itemIds.length} 个项目</div>
                 <div style="margin-top:8px;color:#909399;font-size:12px">您也可以在整体验收时一并验收所有阶段。</div>`,
                '✓ 确认验收', '取消');
              if (!ok) return;
              runSafely(() => {
                State.acceptPhase(orderId, phaseKey, itemIds, '客户分阶段验收通过');
                UI.toast(`${phase.name} 验收通过`, 'success');
                m.body.innerHTML = renderBody(); bind();
              });
            };
          });
          m.body.querySelectorAll('[data-close]').forEach(b => b.onclick = () => m.close());
        };
        bind();
      });
    },

    viewReturnedNote(orderId) {
      runSafely(() => {
        const order = Store.getOrder(orderId);
        const returnedEvent = (order.timeline || []).find(e => e.type === 'returned');
        const note = returnedEvent ? returnedEvent.note : '暂无退回意见';
        UI.alert('退回报价意见', `<div style="background:#fff1f0;padding:12px 16px;border-radius:6px;color:#a8071a;line-height:1.7">${note}</div>`);
      });
    },

    waitForRequote(orderId) {
      UI.toast('已通知师傅重新报价，请耐心等待', 'info');
    },

    async confirmQuote(orderId) {
      const order = Store.getOrder(orderId);
      const phases = Store.getPhases(orderId);
      const unconfirmedCount = phases ? Store.getUnconfirmedItems(orderId).length : 0;

      let confirmMsg = `<div>您即将确认以下报价，确认后将进入施工安排。</div>
         <div style="margin:12px 0;padding:14px;background:#fafbfc;border-radius:6px">
           <div style="font-weight:600;margin-bottom:6px">${order.title}</div>
           <div><b>报价总额：<span style="font-size:18px;color:#ff4b2b">${Util.fmtMoney(order.pricing.total)}</span></b></div>
           <div style="margin-top:4px;color:#909399">预估上限：${Util.fmtMoney(order.estimateUpper)} · 保修：${order.warranty.months ? order.warranty.months + ' 个月' : '无'}</div>
         </div>`;

      if (unconfirmedCount > 0) {
        confirmMsg += `<div style="background:#fffbe6;padding:10px 14px;border-radius:6px;margin-bottom:10px;border:1px solid #ffe58f">
          <span style="color:#ad4e00">⚠️ 有 ${unconfirmedCount} 个项目未单独确认，将随本次全部确认一并确认。</span>
        </div>`;
      }

      confirmMsg += `<div style="color:#ad4e00">⚠️ 确认后，<b>师傅一旦开工报价即锁价</b>，后续任何增项都将走变更单。</div>`;

      const ok = await UI.confirm('确认报价？', confirmMsg, '✅ 我已阅读并确认报价', '再想想');
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
    }
  };

  global.ClientPanel = ClientPanel;
})(window);
