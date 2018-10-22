const productStatus = [{code: 1, desc: '生产中'}, {code: 0, desc: '已停产'}];

new Vue({
    el: '#app',
    data: {
        loading: true,
        loginUser: {},
        companyInfo: {},
        statusOptions: productStatus,
        searchForm: {},
        product_list: [],
        multipleSelection: [],
        editDialogVisible: false,
        productForm: {
            code: '',
            name: '',
            specification: '',
            unit: '只'
        },
        isAdd: true,
        rules: {
            code: [
                {required: true, message: '请输入产品编码', trigger: 'blur'}
            ],
            name: [
                {required: true, message: '请输入产品名称', trigger: 'blur'}
            ],
            specification: [
                {required: true, message: '请输入规格', trigger: 'blur'}
            ],
            unit: [
                {required: true, message: '请输入单位', trigger: 'blur'}
            ]
        }
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
        this.initSearch();
    },
    methods: {
        initSearch() {
            this.searchForm = {
                companyId: this.companyInfo.id,
                name: '',
                status: ''
            };
            this.getProductList();
        },
        getProductList() {
            let selectSql = 'select * from product';
            let paramArr = [];
            let whereSql = {
                companyId: {
                    test: function (value) {
                        return value !== null && value !== '';
                    },
                    getSql: function () {
                        return 'and companyId = ?';
                    },
                    getValue: function (value) {
                        return value;
                    }
                },
                name: {
                    test: function (value) {
                        return value !== null && value !== '';
                    },
                    getSql: function () {
                        return 'and name like ?';
                    },
                    getValue: function (value) {
                        return '%' + value + '%';
                    }
                },
                status: {
                    test: function (value) {
                        return value !== null && value !== '';
                    },
                    getSql: function () {
                        return 'and status = ?';
                    },
                    getValue: function (value) {
                        return value;
                    }
                }
            };

            let whereResult = webSqlUtils.convertForSelect(this.searchForm, whereSql);
            if (whereResult) {
                selectSql = selectSql + whereResult.paramStr;
                paramArr = whereResult.paramArr;
            }
            selectSql += ' order by id desc';

            let _this = this;
            let productList = [];
            webSqlUtils.exeSql(selectSql, paramArr).then(function (result) {
                let resultCount = result.rows.length;
                if (resultCount > 0) {
                    for (let i = 0; i < resultCount; i++) {
                        productList.push(result.rows[i]);
                    }
                }
                _this.product_list = productList;
                _this.loading = false;
            }).catch(function (error) {
                webSqlUtils.commonDBReject(error, _this.$message);
            });
        },
        onSearch() {
            this.loading = true;
            this.getProductList();
        },
        onReset() {
            this.$refs['searchForm'].resetFields();
        },
        //列表数据格式化
        statusFormatter(row, column, cellValue, index) {
            let status = _.find(productStatus, {code: cellValue});
            return status.desc;
        },
        dateFormatter(row, column, cellValue, index) {
            return moment(new Date(cellValue)).format('YYYY-MM-DD HH:mm:ss');
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
            this.isAdd = true;
            this.editDialogVisible = true;
            if (this.$refs['productForm']) {
                this.$refs['productForm'].clearValidate();
            }
            this.productForm = {
                code: '',
                name: '',
                specification: '',
                unit: '只'
            };
        },
        openEditDialog() {
            let selectedCount = this.multipleSelection.length;
            if (selectedCount !== 1) {
                this.$message.warning("请选择一条您要编辑的数据");
                return false;
            }
            this.isAdd = false;
            this.editDialogVisible = true;
            if (this.$refs['productForm']) {
                this.$refs['productForm'].clearValidate();
            }
            this.productForm = {
                id: this.multipleSelection[0].id,
                code: this.multipleSelection[0].code,
                name: this.multipleSelection[0].name,
                specification: this.multipleSelection[0].specification,
                unit: this.multipleSelection[0].unit
            };
        },
        addOrEditProduct() {
            this.$refs['productForm'].validate((valid) => {
                if (valid) {
                    if (this.isAdd) {
                        let productInfo = {
                            companyId: this.companyInfo.id,
                            code: this.productForm.code,
                            name: this.productForm.name,
                            specification: this.productForm.specification,
                            unit: this.productForm.unit,
                            status: 1,
                            createTime: new Date(),
                            createPerson: this.loginUser.code,
                            updateTime: new Date(),
                            updatePerson: this.loginUser.code
                        };
                        let insertSqlResult = webSqlUtils.convertForInsert('product', productInfo);
                        let _this = this;
                        webSqlUtils.exeSql(insertSqlResult.insertSql, insertSqlResult.insertValue).then(function (result) {
                            if (result.rowsAffected === 1) {
                                _this.$message.success("新增产品成功");
                                _this.initSearch();
                            }
                        }).catch(function (error) {
                            webSqlUtils.commonDBReject(error, _this.$message);
                        });
                    } else {
                        let updateSql = 'update product set name = ?,specification = ?,unit = ?,updateTime = ?,updatePerson = ? where id = ?';
                        let updateParamArr = [];
                        updateParamArr.push(this.productForm.name);
                        updateParamArr.push(this.productForm.specification);
                        updateParamArr.push(this.productForm.unit);
                        updateParamArr.push(new Date());
                        updateParamArr.push(this.loginUser.code);
                        updateParamArr.push(this.productForm.id);
                        let _this = this;
                        webSqlUtils.exeSql(updateSql, updateParamArr).then(function (result) {
                            if (result.rowsAffected === 1) {
                                _this.$message.success("编辑产品成功");
                                _this.initSearch();
                            }
                        }).catch(function (error) {
                            webSqlUtils.commonDBReject(error, _this.$message);
                        });
                    }
                    this.editDialogVisible = false;
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
                let deleteSql = 'delete from product where id = ?';
                let deletePromiseArr = [];
                for (let i = 0; i < this.multipleSelection.length; i++) {
                    let deleteParamArr = [];
                    deleteParamArr.push(this.multipleSelection[i].id);
                    deletePromiseArr.push(webSqlUtils.exeSql(deleteSql, deleteParamArr));
                }
                Promise.all(deletePromiseArr).then((results) => {
                    let isSuccess = true;
                    for (let i = 0; i < results.length; i++) {
                        if (results[i].rowsAffected !== 1) {
                            isSuccess = false;
                            break;
                        }
                    }
                    if (isSuccess) {
                        this.$message.success("删除产品成功");
                    } else {
                        this.$message.error("删除产品失败");
                    }
                    this.initSearch();
                }).catch((error) => {
                    webSqlUtils.commonDBReject(error, this.$message);
                });
            }).catch(() => {
            });
        },

        changeStatus(row) {
            let confirmMsg = '';
            let updateStatus = 0;
            if (row.status === 0) {
                confirmMsg = '确定要生产该产品？';
                updateStatus = 1;
            } else {
                confirmMsg = '确定要停产该产品？';
                updateStatus = 0;
            }

            this.$confirm(confirmMsg, '提示', {
                confirmButtonText: '确定',
                cancelButtonText: '取消',
                type: 'warning'
            }).then(() => {
                let updateSql = 'update product set status = ?,updateTime = ?, updatePerson = ? where id = ?';
                let updateParamArr = [];
                updateParamArr.push(updateStatus);
                updateParamArr.push(new Date());
                updateParamArr.push(this.loginUser.code);
                updateParamArr.push(row.id);
                webSqlUtils.exeSql(updateSql, updateParamArr).then((result) => {
                    if (result.rowsAffected === 1) {
                        this.$message.success("修改产品状态成功");
                        this.initSearch();
                    }
                }).catch((error) => {
                    webSqlUtils.commonDBReject(error, this.$message);
                });
            }).catch(() => {
            });
        }
    },
    filters: {
        dialogTitleFilter(isAdd) {
            if (isAdd) {
                return '新增产品';
            }
            return '编辑产品';
        }
    }
});