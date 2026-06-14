/* global window, Store, Util */
(function (global) {

  const VALID_TRANSITIONS = {
    draft:     ['assigned'],
    assigned:  ['surveying', 'draft'],
    surveying: ['priced', 'assigned'],
    priced:    ['review', 'pending', 'returned', 'priced'],
    review:    ['pending', 'returned', 'review'],
    pending:   ['confirmed', 'returned', 'pending'],
    returned:  ['priced', 'review'],
    confirmed: ['working', 'confirmed'],
    working:   ['change', 'checking', 'working'],
    change:    ['working', 'checking', 'change'],
    checking:  ['done', 'rework', 'checking'],
    rework:    ['checking', 'rework', 'working'],
    done:      ['rework']
  };

  function canTransition(current, next) {
    const list = VALID_TRANSITIONS[current] || [];
    return list.includes(next);
  }

  function addTimeline(order, ev) {
    order.timeline = order.timeline || [];
    order.timeline.push(Object.assign({
      id: Util.uid(),
      time: Date.now(),
      userId: Store.currentRole().id
    }, ev));
  }

  function assert(cond, msg) {
    if (!cond) {
      const e = new Error(msg);
      e.isBiz = true;
      throw e;
    }
  }

  const State = {
    canTransition,

    assignOrder(orderId, techId) {
      const order = Store.getOrder(orderId);
      assert(order, '工单不存在');
      const me = Store.currentRole();
      assert(me.role === 'service', '仅客服可派单');
      assert(order.status === 'draft' || order.status === 'assigned',
        '当前状态不可派单（仅待派单或待勘查可以重新派单）');
      const users = Store.users();
      const tech = users[techId];
      assert(tech && tech.role === 'tech', '被指派人员必须是师傅');
      order.techUserId = techId;
      order.status = 'assigned';
      addTimeline(order, {
        type: 'status', sub: 'assigned', title: '派单',
        content: `已重新指派给 ${tech.name}（${tech.title}）。`,
        meta: [{ k: '派给', v: tech.name }]
      });
      return Store.saveOrder(order);
    },

    markSurveying(orderId) {
      const order = Store.getOrder(orderId);
      assert(order, '工单不存在');
      const me = Store.currentRole();
      assert(me.role === 'tech', '仅师傅可执行此操作');
      assert(order.techUserId === me.id, '该工单并非指派给您');
      assert(canTransition(order.status, 'surveying'), `当前状态「${Util.statusLabel(order.status).text}」不可进入勘查`);
      order.status = 'surveying';
      addTimeline(order, { type: 'status', sub: 'surveying', title: '出发勘查',
        content: `${me.name} 已出发前往现场勘查。` });
      return Store.saveOrder(order);
    },

    submitSurvey(orderId, survey) {
      const order = Store.getOrder(orderId);
      assert(order, '工单不存在');
      const me = Store.currentRole();
      assert(me.role === 'tech', '仅师傅可提交勘查');
      assert(order.techUserId === me.id, '该工单并非指派给您');
      order.survey = Object.assign({ visitedAt: Date.now() }, survey);
      order.status = 'priced';
      order.pricing = Util.calcOrderPricing(order);
      return Store.saveOrder(order);
    },

    submitQuote(orderId, patch) {
      const order = Store.getOrder(orderId);
      assert(order, '工单不存在');
      const me = Store.currentRole();
      assert(me.role === 'tech', '仅师傅可提交报价');
      assert(order.techUserId === me.id, '该工单并非指派给您');
      if (patch.materials) order.materials = patch.materials;
      if (patch.labor) order.labor = patch.labor;
      if (patch.visitFee !== undefined) order.visitFee = Number(patch.visitFee);
      if (patch.addItems) order.addItems = patch.addItems;
      if (patch.warranty) order.warranty = patch.warranty;
      if (patch.survey) order.survey = Object.assign(order.survey || {}, patch.survey);
      if (patch.overEstimateReason) order.overEstimateReason = patch.overEstimateReason;
      order.pricing = Util.calcOrderPricing(order);
      const over = order.pricing.total > (order.estimateUpper || 0);
      if (over) {
        assert(order.overEstimateReason && order.overEstimateReason.trim().length >= 10,
          '报价已超过预估上限（' + Util.fmtMoney(order.estimateUpper) + '），请必须填写不少于 10 个字的超预估原因。');
        order.status = 'review';
        order.reviewStatus = 'pending';
        addTimeline(order, { type: 'status', sub: 'review', title: '报价生成（超预估）',
          content: `报价总额 ${Util.fmtMoney(order.pricing.total)}，超过预估上限 ${Util.fmtMoney(order.estimateUpper)}，已填写原因并提交财务复核。`,
          meta: [
            { k: '报价总额', v: Util.fmtMoney(order.pricing.total) },
            { k: '预估上限', v: Util.fmtMoney(order.estimateUpper) },
            { k: '超出', v: Util.fmtMoney(order.pricing.total - order.estimateUpper) },
            { k: '原因', v: order.overEstimateReason }
          ]
        });
      } else {
        order.status = 'pending';
        order.reviewStatus = null;
        addTimeline(order, { type: 'status', sub: 'pending', title: '报价生成',
          content: `报价总额 ${Util.fmtMoney(order.pricing.total)}，在预估上限 ${Util.fmtMoney(order.estimateUpper)} 之内，已提交客户确认。` });
      }
      return Store.saveOrder(order);
    },

    reviewerApprove(orderId, pass, note) {
      const order = Store.getOrder(orderId);
      assert(order, '工单不存在');
      const me = Store.currentRole();
      assert(me.role === 'reviewer', '仅财务可执行复核');
      assert(order.status === 'review', '当前状态不可复核');
      if (pass) {
        order.status = 'pending';
        order.reviewStatus = 'approved';
        addTimeline(order, { type: 'finance', sub: 'review_ok', title: '超预估复核通过',
          content: `${me.name} 已通过超预估复核：${note || '同意该报价。'}`,
          meta: [{ k: '复核人', v: me.name }, { k: '结论', v: '通过' }] });
      } else {
        order.status = 'returned';
        order.reviewStatus = 'rejected';
        order.returnReason = note || '复核未通过，请重新调整报价。';
        order.returnedAt = Date.now();
        addTimeline(order, { type: 'finance', sub: 'review_reject', title: '超预估复核驳回',
          content: `${me.name} 驳回报价：${order.returnReason}`,
          meta: [{ k: '复核人', v: me.name }, { k: '结论', v: '驳回' }] });
      }
      return Store.saveOrder(order);
    },

    clientConfirm(orderId) {
      const order = Store.getOrder(orderId);
      assert(order, '工单不存在');
      const me = Store.currentRole();
      assert(me.role === 'client', '仅客户可确认报价');
      assert(order.clientId === me.id, '这不是您的工单');
      assert(order.status === 'pending', `当前状态「${Util.statusLabel(order.status).text}」不可确认`);
      order.status = 'confirmed';
      addTimeline(order, { type: 'status', sub: 'confirmed', title: '客户确认报价',
        content: `${me.name} 已确认报价 ${Util.fmtMoney(order.pricing.total)}。` });
      return Store.saveOrder(order);
    },

    clientReturn(orderId, reason) {
      const order = Store.getOrder(orderId);
      assert(order, '工单不存在');
      const me = Store.currentRole();
      assert(me.role === 'client', '仅客户可退回报价');
      assert(order.clientId === me.id, '这不是您的工单');
      assert(order.status === 'pending' || order.status === 'review',
        `当前状态「${Util.statusLabel(order.status).text}」不可退回`);
      assert(reason && reason.trim().length >= 5, '请填写不少于 5 个字的退回原因');
      order.status = 'returned';
      order.returnReason = reason;
      order.returnedAt = Date.now();
      addTimeline(order, { type: 'status', sub: 'returned', title: '客户退回报价',
        content: `${me.name} 退回报价。`,
        meta: [{ k: '退回原因', v: reason }] });
      return Store.saveOrder(order);
    },

    startWork(orderId) {
      const order = Store.getOrder(orderId);
      assert(order, '工单不存在');
      const me = Store.currentRole();
      assert(me.role === 'tech', '仅师傅可开工');
      assert(order.techUserId === me.id, '该工单并非指派给您');
      assert(order.status === 'confirmed',
        `当前状态「${Util.statusLabel(order.status).text}」不可开工，必须客户确认后才能开工。`);
      order.status = 'working';
      order.priceLocked = true;
      order.workStartedAt = Date.now();
      addTimeline(order, { type: 'status', sub: 'working', title: '开工（报价已锁价）',
        content: `${me.name} 已开工。此后原始报价已锁价，任何价格调整必须走变更单流程并获得客户确认。`,
        meta: [{ k: '状态', v: '🔒 原始报价已锁价' }] });
      return Store.saveOrder(order);
    },

    submitChange(orderId, changeOrder) {
      const order = Store.getOrder(orderId);
      assert(order, '工单不存在');
      const me = Store.currentRole();
      assert(me.role === 'tech', '仅师傅可提交变更');
      assert(order.techUserId === me.id, '该工单并非指派给您');
      assert(order.status === 'working' || order.status === 'change',
        `当前状态「${Util.statusLabel(order.status).text}」不可提交变更，仅施工中可走变更单流程。`);
      assert(order.priceLocked, '系统异常：当前工单未进入锁价状态。');
      const totalAdd = changeOrder.items.reduce((s, x) => s + Number(x.amount || 0), 0);
      assert(totalAdd > 0, '变更单合计金额必须大于 0');
      changeOrder.items.forEach(x => {
        assert(x.name && x.name.trim(), '每个变更项必须有名称');
        assert(x.reason && x.reason.trim().length >= 5, '每个变更项必须填写不少于 5 字的原因');
        assert(Number(x.amount) > 0, '每个变更项金额必须大于 0');
      });
      changeOrder.id = Store.newChangeId();
      changeOrder.createdAt = Date.now();
      changeOrder.createdBy = me.id;
      changeOrder.totalAdd = Math.round(totalAdd * 100) / 100;
      changeOrder.status = 'pending';
      order.changeOrders = order.changeOrders || [];
      order.changeOrders.push(changeOrder);
      order.status = 'change';
      order.addItems = order.addItems || [];
      changeOrder.items.forEach(x => {
        order.addItems.push({ name: x.name, amount: Number(x.amount), reason: x.reason, approved: false, changeId: changeOrder.id });
      });
      order.pricing = Util.calcOrderPricing(order);
      addTimeline(order, { type: 'change', sub: 'requested', title: '施工变更申请',
        content: `${me.name} 提交变更单「${changeOrder.id}」，涉及 ${changeOrder.items.length} 项，合计追加 ${Util.fmtMoney(changeOrder.totalAdd)}。`,
        meta: [{ k: '变更单号', v: changeOrder.id }, { k: '追加合计', v: Util.fmtMoney(changeOrder.totalAdd) }] });
      return Store.saveOrder(order);
    },

    approveChange(orderId, changeId, pass, reason) {
      const order = Store.getOrder(orderId);
      assert(order, '工单不存在');
      const me = Store.currentRole();
      assert(me.role === 'client', '仅客户可审批变更');
      assert(order.clientId === me.id, '这不是您的工单');
      const co = (order.changeOrders || []).find(x => x.id === changeId);
      assert(co, '变更单不存在');
      assert(co.status === 'pending', '该变更单已处理');
      if (pass) {
        co.status = 'approved';
        co.approvedAt = Date.now();
        co.approvedBy = me.id;
        (order.addItems || []).forEach(it => {
          if (it.changeId === changeId) it.approved = true;
        });
        order.status = 'working';
        order.pricing = Util.calcOrderPricing(order);
        addTimeline(order, { type: 'change', sub: 'approved', title: '客户确认变更',
          content: `${me.name} 已确认变更单「${changeId}」，合计追加 ${Util.fmtMoney(co.totalAdd)}。新报价总额：${Util.fmtMoney(order.pricing.total)}。`,
          meta: [{ k: '变更单', v: changeId }, { k: '追加金额', v: Util.fmtMoney(co.totalAdd) }, { k: '新总额', v: Util.fmtMoney(order.pricing.total) }] });
      } else {
        co.status = 'rejected';
        co.rejectedAt = Date.now();
        co.rejectedBy = me.id;
        co.rejectReason = reason || '不同意该变更';
        order.addItems = (order.addItems || []).filter(it => it.changeId !== changeId);
        order.status = 'working';
        order.pricing = Util.calcOrderPricing(order);
        addTimeline(order, { type: 'change', sub: 'rejected', title: '客户驳回变更',
          content: `${me.name} 驳回变更单「${changeId}」：${co.rejectReason}`,
          meta: [{ k: '变更单', v: changeId }, { k: '原因', v: co.rejectReason }] });
      }
      return Store.saveOrder(order);
    },

    tryEditPrice(orderId) {
      const order = Store.getOrder(orderId);
      assert(order, '工单不存在');
      assert(!order.priceLocked,
        '❌ 已开工（原始报价已锁价）！不能直接修改报价，请走「变更单」流程追加项目。');
      return true;
    },

    finishWork(orderId, note) {
      const order = Store.getOrder(orderId);
      assert(order, '工单不存在');
      const me = Store.currentRole();
      assert(me.role === 'tech', '仅师傅可完工');
      assert(order.techUserId === me.id, '该工单并非指派给您');
      assert(order.status === 'working' || order.status === 'rework',
        `当前状态「${Util.statusLabel(order.status).text}」不可申请验收`);
      const pending = (order.changeOrders || []).some(c => c.status === 'pending');
      assert(!pending, '存在待客户确认的变更单，请先处理变更单再申请验收。');
      order.status = 'checking';
      order.finishedAt = Date.now();
      addTimeline(order, { type: 'status', sub: 'checking', title: '完工待验收',
        content: `${me.name} 已施工完毕，等待客户验收：${note || '施工完成'}`,
        meta: [{ k: '完工说明', v: note || '施工完成' }] });
      return Store.saveOrder(order);
    },

    acceptOrder(orderId, note) {
      const order = Store.getOrder(orderId);
      assert(order, '工单不存在');
      const me = Store.currentRole();
      assert(me.role === 'client', '仅客户可验收');
      assert(order.clientId === me.id, '这不是您的工单');
      assert(order.status === 'checking',
        `当前状态「${Util.statusLabel(order.status).text}」不可验收`);
      order.status = 'done';
      order.acceptedAt = Date.now();
      order.acceptNote = note || '';
      addTimeline(order, { type: 'status', sub: 'accepted', title: '客户验收通过',
        content: `${me.name} 已验收通过：${note || '工程质量合格，同意验收。'}`,
        meta: [{ k: '保修', v: (order.warranty && order.warranty.months ? order.warranty.months + ' 个月' : '无') }] });
      return Store.saveOrder(order);
    },

    rejectAccept(orderId, note) {
      const order = Store.getOrder(orderId);
      assert(order, '工单不存在');
      const me = Store.currentRole();
      assert(me.role === 'client', '仅客户可驳回验收');
      assert(order.clientId === me.id, '这不是您的工单');
      assert(order.status === 'checking',
        `当前状态「${Util.statusLabel(order.status).text}」不可驳回验收`);
      assert(note && note.trim().length >= 5, '请填写不少于 5 字的返修原因');
      order.status = 'rework';
      order.reworkCount = (order.reworkCount || 0) + 1;
      order.reworkNote = note;
      addTimeline(order, { type: 'status', sub: 'rework', title: '客户驳回验收 → 返修',
        content: `验收未通过，进入返修。返修原因：${note}`,
        meta: [{ k: '第 N 次返修', v: order.reworkCount }] });
      return Store.saveOrder(order);
    },

    recordInvoice(orderId, amount, invoiceNo) {
      const order = Store.getOrder(orderId);
      assert(order, '工单不存在');
      const me = Store.currentRole();
      assert(me.role === 'reviewer', '仅财务可开具发票');
      assert(amount > 0, '金额必须大于 0');
      order.invoices = order.invoices || [];
      const inv = { id: 'INV' + Util.uid().slice(-6).toUpperCase(), amount: Number(amount),
        invoiceNo: invoiceNo || ('FP' + Date.now()), date: Date.now(), status: 'issued' };
      order.invoices.push(inv);
      addTimeline(order, { type: 'finance', sub: 'invoice', title: '开具发票',
        content: `${me.name} 开具发票：${inv.invoiceNo}，金额 ${Util.fmtMoney(inv.amount)}。`,
        meta: [{ k: '发票号', v: inv.invoiceNo }, { k: '金额', v: Util.fmtMoney(inv.amount) }] });
      return Store.saveOrder(order);
    },

    recordDeposit(orderId, amount, note) {
      const order = Store.getOrder(orderId);
      assert(order, '工单不存在');
      const me = Store.currentRole();
      assert(me.role === 'reviewer' || me.role === 'service', '仅财务或客服可登记收款');
      assert(amount > 0, '金额必须大于 0');
      order.deposit = Number(order.deposit || 0) + Number(amount);
      addTimeline(order, { type: 'finance', sub: 'deposit', title: '登记收款/订金',
        content: `${me.name} 登记收款 ${Util.fmtMoney(amount)}：${note || '客户支付'}。累计收款：${Util.fmtMoney(order.deposit)}。`,
        meta: [{ k: '本次', v: Util.fmtMoney(amount) }, { k: '累计', v: Util.fmtMoney(order.deposit) }] });
      return Store.saveOrder(order);
    },

    recordCorrection(orderId, amount, reason) {
      const order = Store.getOrder(orderId);
      assert(order, '工单不存在');
      const me = Store.currentRole();
      assert(me.role === 'reviewer', '仅财务可执行费用冲正');
      assert(amount !== 0, '冲正金额不可为 0');
      assert(reason && reason.trim().length >= 8, '请填写不少于 8 字的冲正原因');
      order.deposit = Number(order.deposit || 0) + Number(amount);
      addTimeline(order, { type: 'finance', sub: 'correction', title: '费用冲正',
        content: `${me.name} 执行冲正：${amount > 0 ? '+' : ''}${Util.fmtMoney(amount)}。原因：${reason}`,
        meta: [{ k: '冲正金额', v: (amount > 0 ? '+' : '') + Util.fmtMoney(amount) }, { k: '原因', v: reason }] });
      return Store.saveOrder(order);
    },

    addMessage(orderId, content) {
      const order = Store.getOrder(orderId);
      assert(order, '工单不存在');
      const me = Store.currentRole();
      assert(content && content.trim().length >= 2, '沟通内容至少 2 个字');
      addTimeline(order, { type: 'comm', sub: 'msg', title: '沟通记录',
        content: `${me.name}：${content.trim()}` });
      return Store.saveOrder(order);
    }
  };

  global.State = State;
})(window);
