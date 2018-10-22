const customerStatus = [{code: 1, desc: '合作中'}, {code: 0, desc: '停止合作'}];

new Vue({
    el: '#app',
    data: {
        loading: true,
        loginUser: {},
        companyInfo: {},
        statusOptions: customerStatus,
        searchForm: {},
        customerList: [],
        multipleSelection: [],
        editDialogVisible: false,
        customerForm: {
            name: '',
            address: '',
            contactName: '',
            contactPhone: ''
        },
        isAdd: true,
        rules: {
            name: [
                {required: true, message: '请输入客户名称', trigger: 'blur'}
            ],
            address: [
                {required: true, message: '请输入地址', trigger: 'blur'}
            ],
            contactName: [
                {required: true, message: '请输入联系人名称', trigger: 'blur'}
            ],
            contactPhone: [
                {required: true, message: '请输入联系人号码', trigger: 'blur'}
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
            this.getCusList();
        },
        getCusList() {
            let selectSql = 'select * from customer';
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
            let customerList = [];
            webSqlUtils.exeSql(selectSql, paramArr).then(function (result) {
                let resultCount = result.rows.length;
                if (resultCount > 0) {
                    for (let i = 0; i < resultCount; i++) {
                        customerList.push(result.rows[i]);
                    }
                }
                _this.customerList = customerList;
                _this.loading = false;
            }).catch(function (error) {
                webSqlUtils.commonDBReject(error, _this.$message);
            });
        },
        onSearch() {
            this.loading = true;
            this.getCusList();
        },
        onReset() {
            this.$refs['searchForm'].resetFields();
        },
        //列表数据格式化
        statusFormatter(row, column, cellValue, index) {
            let status = _.find(customerStatus, {code: cellValue});
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
            if (this.$refs['customerForm']) {
                this.$refs['customerForm'].clearValidate();
            }
            this.customerForm = {
                name: '',
                address: '',
                contactName: '',
                contactPhone: ''
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
            if (this.$refs['customerForm']) {
                this.$refs['customerForm'].clearValidate();
            }
            this.customerForm = {
                id: this.multipleSelection[0].id,
                name: this.multipleSelection[0].name,
                address: this.multipleSelection[0].address,
                contactName: this.multipleSelection[0].contactName,
                contactPhone: this.multipleSelection[0].contactPhone
            };
        },
        addOrEditCustomer() {
            this.$refs['customerForm'].validate((valid) => {
                if (valid) {
                    if (this.isAdd) {
                        let customerInfo = {
                            companyId: this.companyInfo.id,
                            name: this.customerForm.name,
                            address: this.customerForm.address,
                            contactName: this.customerForm.contactName,
                            contactPhone: this.customerForm.contactPhone,
                            status: 1,
                            createTime: new Date(),
                            createPerson: this.loginUser.code,
                            updateTime: new Date(),
                            updatePerson: this.loginUser.code
                        };
                        let insertSqlResult = webSqlUtils.convertForInsert('customer', customerInfo);
                        let _this = this;
                        webSqlUtils.exeSql(insertSqlResult.insertSql, insertSqlResult.insertValue).then(function (result) {
                            if (result.rowsAffected === 1) {
                                _this.$message.success("新增客户成功");
                                _this.initSearch();
                            }
                        }).catch(function (error) {
                            webSqlUtils.commonDBReject(error, _this.$message);
                        });
                    } else {
                        let updateSql = 'update customer set name = ?,address = ?,contactName = ?,contactPhone = ?,updateTime = ?,updatePerson = ? where id = ?';
                        let updateParamArr = [];
                        updateParamArr.push(this.customerForm.name);
                        updateParamArr.push(this.customerForm.address);
                        updateParamArr.push(this.customerForm.contactName);
                        updateParamArr.push(this.customerForm.contactPhone);
                        updateParamArr.push(new Date());
                        updateParamArr.push(this.loginUser.code);
                        updateParamArr.push(this.customerForm.id);
                        let _this = this;
                        webSqlUtils.exeSql(updateSql, updateParamArr).then(function (result) {
                            if (result.rowsAffected === 1) {
                                _this.$message.success("编辑客户成功");
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
                let deleteSql = 'delete from customer where id = ?';
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
                        this.$message.success("删除客户成功");
                    } else {
                        this.$message.error("删除客户失败");
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
                confirmMsg = '确定与该客户合作？';
                updateStatus = 1;
            } else {
                confirmMsg = '确定停止与该客户合作？';
                updateStatus = 0;
            }

            this.$confirm(confirmMsg, '提示', {
                confirmButtonText: '确定',
                cancelButtonText: '取消',
                type: 'warning'
            }).then(() => {
                let updateSql = 'update customer set status = ?,updateTime = ?, updatePerson = ? where id = ?';
                let updateParamArr = [];
                updateParamArr.push(updateStatus);
                updateParamArr.push(new Date());
                updateParamArr.push(this.loginUser.code);
                updateParamArr.push(row.id);
                webSqlUtils.exeSql(updateSql, updateParamArr).then((result) => {
                    if (result.rowsAffected === 1) {
                        this.$message.success("修改客户状态成功");
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
                return '新增客户';
            }
            return '编辑客户';
        }
    }
});