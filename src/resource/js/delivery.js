const printStatus = [{code: 1, desc: '已打印'}, {code: 0, desc: '未打印'}];

new Vue({
    el: '#app',
    data: {
        loading: true,
        loginUser: {},
        companyInfo: {},
        printOptions: printStatus,
        searchForm: {},
        customerList: [],
        companyContactList: [],
        deliveryList: [],
        deliveryListLength: 0,
        deliveryListPageSize: 1,
        currentPage: 1,
        deliveryDetailList: [],
        productList: [],
        multipleSelection: [],
        editDialogVisible: false,
        detailEditDialogVisible: false,
        deliveryForm: {
            orderNo: '',
            stockOutDate: '',
            customerId: '',
            companyContactId: ''
        },
        deliveryDetailForm: {
            productId: '',
            quantity: 0,
            price: 0,
            packageSize: 0,
            remark: ''
        },
        isAdd: true,
        isAddDetail: true,
        rules: {
            orderNo: [
                {required: true, message: '请输入订单号', trigger: 'blur'},
                { min: 1, max: 32, message: '订单号长度不能超过32个字符', trigger: 'blur' }
            ],
            stockOutDate: [
                {required: true, message: '请选择送货时间', trigger: 'blur'}
            ],
            customerId: [
                {required: true, message: '请选择收货单位', trigger: 'change'}
            ],
            companyContactId: [
                {required: true, message: '请选择经半个人', trigger: 'change'}
            ]
        },
        detailRules: {
            productId: [
                {required: true, message: '请选择发货产品', trigger: 'change'}
            ],
            quantity: [
                {required: true, message: '请输入数量', trigger: 'change'},
                {type: 'number', min: 1, message: '数量需大于0', trigger: 'change'}
            ],
            price: [
                {required: true, message: '请输入单价', trigger: 'change'},
                {type: 'number', min: 1, message: '单价需大于0', trigger: 'change'}
            ],
            packageSize: [
                {required: true, message: '请输入件/箱', trigger: 'change'},
                {type: 'number', min: 1, message: '件/箱需大于0', trigger: 'change'}
            ]
        },
        currentRow: null,
        deliveryPrintData: null,
        deliveryDetailListPrintData: null
    },
    created() {
        this.loginUser = JSON.parse(sessionStorage.getItem('userInfo'));
        if (!this.loginUser) {
            window.parent.location.href = "../index/login.html";
            return false;
        }
        this.companyInfo = JSON.parse(localStorage.getItem('companyInfo'));
        if (!this.companyInfo) {
            window.parent.location.href = "../index/login.html";
            return false;
        }
    },
    mounted() {
        // 打开数据库连接
        webSqlUtils.openDb();
        if (!webSqlUtils.database) {
            this.$message.error('链接数据库异常');
        }
        this.loadCustomerList();
        this.loadCompanyContactList();
        this.loadProductList();
        this.initSearch();
    },
    methods: {
        initSearch() {
            this.searchForm = {
                companyId: this.companyInfo.id,
                orderNo: '',
                customerId: '',
                isPrinted: ''
            };
            this.getDeliveryList();
        },
        findPageByQuery(query) {
            deliveryManager.findPageByQuery(query).then((res) => {
                this.deliveryList = res.data;
                this.deliveryListLength = res.totalCount;
            }).catch((err) => {
                console.log(err);
                this.$message.error(err.message);
            });
        },
        getDeliveryList() {
            this.loading = false;

            let query = Object.assign({}, this.searchForm, {pageNum: 1, pageSize: this.deliveryListPageSize});
            this.findPageByQuery(query);
        },
        handleSizeChange(val) {
            this.deliveryListPageSize = val;
            this.currentPage = 1;
            let query = Object.assign({}, this.searchForm, {pageNum: this.currentPage, pageSize: this.deliveryListPageSize});
            this.findPageByQuery(query)
        },
        handleCurrentChange(val) {
            let query = Object.assign({}, this.searchForm, {pageNum: val, pageSize: this.deliveryListPageSize});
            this.findPageByQuery(query)
        },
        onSearch() {
            this.loading = true;
            this.getDeliveryList();
        },
        onReset() {
            this.$refs['searchForm'].resetFields();
        },
        loadCustomerList() {
            let selectSql = 'select * from customer where companyId = ? order by id desc';
            let paramArr = [];
            paramArr.push(this.companyInfo.id);

            let customerList = [];
            webSqlUtils.exeSql(selectSql, paramArr).then((result) => {
                let resultCount = result.rows.length;
                if (resultCount > 0) {
                    for (let i = 0; i < resultCount; i++) {
                        customerList.push(result.rows[i]);
                    }
                }
                this.customerList = customerList;
            }).catch((error) => {
                webSqlUtils.commonDBReject(error, this.$message);
            });
        },
        loadCompanyContactList() {
            let selectSql = 'select * from companyContact where companyId = ? order by id desc';
            let paramArr = [];
            paramArr.push(this.companyInfo.id);

            let companyContactList = [];
            webSqlUtils.exeSql(selectSql, paramArr).then((result) => {
                let resultCount = result.rows.length;
                if (resultCount > 0) {
                    for (let i = 0; i < resultCount; i++) {
                        companyContactList.push(result.rows[i]);
                    }
                }
                this.companyContactList = companyContactList;
            }).catch((error) => {
                webSqlUtils.commonDBReject(error, this.$message);
            });
        },
        loadProductList() {
            let selectSql = 'select * from product where companyId = ? order by id desc';
            let paramArr = [];
            paramArr.push(this.companyInfo.id);

            let productList = [];
            webSqlUtils.exeSql(selectSql, paramArr).then((result) => {
                let resultCount = result.rows.length;
                if (resultCount > 0) {
                    for (let i = 0; i < resultCount; i++) {
                        productList.push(result.rows[i]);
                    }
                }
                this.productList = productList;
            }).catch((error) => {
                webSqlUtils.commonDBReject(error, this.$message);
            });
        },
        //列表数据格式化
        printStatusFormatter(row, column, cellValue, index) {
            let status = _.find(printStatus, {code: cellValue});
            return status.desc;
        },
        dateFormatter(row, column, cellValue, index) {
            return moment(new Date(cellValue)).format('YYYY-MM-DD HH:mm:ss');
        },
        stockOutDateFormatter(row, column, cellValue, index) {
            return moment(new Date(cellValue)).format('YYYY-MM-DD');
        },
        //单击选中
        handleRowClick(row, event, column) {
            if (column.columnKey !== 'optionColumn') {
                this.$refs.multipleTable.toggleRowSelection(row);
            }
        },
        //返回选中的记录
        handleSelectionChange(val) {
            this.multipleSelection = val;
        },
        openAddDialog() {
            if (this.$refs['deliveryForm']) {
                this.$refs['deliveryForm'].clearValidate();
            }
            this.isAdd = true;
            this.editDialogVisible = true;
        },
        openEditDialog() {
            let selectedCount = this.multipleSelection.length;
            if (selectedCount !== 1) {
                this.$message.warning("请选择一条您要编辑的数据");
                return false;
            }
            deliveryManager.findWithDetailById(this.multipleSelection[0].id).then(res => {
                if(res.delivery && res.deliveryDetailList){
                    this.deliveryForm = res.delivery;
                    this.deliveryDetailList = res.deliveryDetailList;
                    if (this.$refs['deliveryForm']) {
                        this.$refs['deliveryForm'].clearValidate();
                    }
                    this.isAdd = false;
                    this.editDialogVisible = true;
                } else {
                    console.log(res);
                    this.$message.error("获取发货单信息失败");
                }
            }).catch(err => {
                console.log(err);
                this.$message.error(err.message);
            });
        },
        onDeliveryDialogClosed() {
            this.deliveryForm = {
                orderNo: '',
                stockOutDate: '',
                customerId: '',
                companyContactId: ''
            };
            this.deliveryDetailList = [];
        },
        generateOrderNo: function () {
            this.deliveryForm.orderNo = deliveryManager.generateOrderNo();
        },
        addOrEditDelivery() {
            this.$refs['deliveryForm'].validate((valid) => {
                if (valid) {
                    if(this.deliveryDetailList && this.deliveryDetailList.length > 0){
                        if (this.isAdd) {
                            let deliveryDTO = Object.assign({}, this.deliveryForm, {companyId: this.companyInfo.id});
                            deliveryManager.add(deliveryDTO, this.deliveryDetailList, this.loginUser).then((res) => {
                                this.$message.success("新增发货单成功");
                                this.editDialogVisible = false;
                                this.initSearch();
                            }).catch((err) => {
                                console.log(err);
                                this.$message.error(err.message);
                            });
                        } else {
                            deliveryManager.update(this.deliveryForm, this.deliveryDetailList, this.loginUser).then((res) => {
                                this.$message.success("编辑发货单成功");
                                this.editDialogVisible = false;
                                this.initSearch();
                            }).catch((err) => {
                                console.log(err);
                                this.$message.error(err.message);
                            });
                        }
                    } else {
                        this.$message.error("请添加发货单明细");
                    }
                } else {
                    return false;
                }
            });
        },

        handleDelete() {
            if (this.multipleSelection.length === 0) {
                this.$message({
                    message: '您没有选中要删除的数据哦~',
                    type: 'warning'
                });
                return false;
            }
            this.$confirm('确定要删除选中的记录?', '提示', {
                confirmButtonText: '确定',
                cancelButtonText: '取消',
                type: 'warning'
            }).then(() => {
                let ids = this.multipleSelection.map((item) => {
                    return item.id;
                });
                deliveryManager.batchDelete(this.companyInfo.id, ids).then((res) => {
                    this.$message.success("删除发货单成功");
                    this.initSearch();
                }).catch((err) => {
                    console.log(err);
                    this.$message.error(err.message);
                });
            }).catch(() => {
            });
        },
        // 打印发货单
        printDelivery(row) {
            deliveryManager.findWithDetailById(row.id).then(res => {
                if(res.delivery && res.deliveryDetailList){
                    console.log(res);

                    this.deliveryPrintData = res.delivery;
                    this.deliveryDetailListPrintData = res.deliveryDetailList;

                    $("#print-content").printArea({
                        mode: 'iframe',
                        popClose: true
                    });
                } else {
                    console.log(res);
                    this.$message.error("获取发货单信息失败");
                }
            }).catch(err => {
                console.log(err);
                this.$message.error(err.message);
            });
        },
        //发货明细表事件
        tableRowClassName({ row, rowIndex }) {
            row.index = rowIndex;
        },
        // handleCurrentChange(val) {
        //     this.currentRow = val;
        // },
        openDetailAddDialog() {
            this.isAddDetail = true;
            this.detailEditDialogVisible = true;
            if (this.$refs['deliveryDetailForm']) {
                this.$refs['deliveryDetailForm'].clearValidate();
            }
        },
        openDetailEditDialog() {
            if (!this.currentRow) {
                this.$message({
                    message: '您没有选中要编辑的数据哦~',
                    type: 'warning'
                });
                return false;
            }
            this.isAddDetail = false;
            this.detailEditDialogVisible = true;
            this.deliveryDetailForm = this.currentRow;
        },
        deleteDeliveryDetail() {
            if (!this.currentRow) {
                this.$message({
                    message: '您没有选中要删除的数据哦~',
                    type: 'warning'
                });
                return false;
            }
            this.deliveryDetailList.splice(this.currentRow.index, 1);
        },
        onProductSelected(productId) {
            this.deliveryDetailForm.product = _.find(this.productList, {id: productId});
        },
        addOrEditDeliveryDetail() {
            this.$refs['deliveryDetailForm'].validate((valid) => {
                if (valid) {
                    let deliveryDetailDTO = Object.assign({}, this.deliveryDetailForm, {companyId: this.companyInfo.id});
                    deliveryManager.doCalculate(deliveryDetailDTO);
                    if (this.isAddDetail) {
                        this.deliveryDetailList.push(deliveryDetailDTO);
                    } else {
                        this.deliveryDetailList.splice(this.currentRow.index, 1, deliveryDetailDTO);
                    }
                    this.detailEditDialogVisible = false;
                } else {
                    return false;
                }
            });
        },
        onDeliveryDetailDialogClosed() {
            this.deliveryDetailForm = {
                productId: '',
                quantity: 0,
                price: 0,
                packageSize: 0,
                remark: ''
            };
        }
    },
    filters: {
        dialogTitleFilter(isAdd) {
            if (isAdd) {
                return '新增发货单';
            }
            return '编辑发货单';
        }
    },
    computed: {
        detailDialogTitleComputed() {
            if (this.isAdd) {
                return '新增发货单明细';
            }
            return '编辑发货单明细';
        }
    }
});