new Vue({
    el: '#app',
    data: {
        loading: true,
        loginUser: {},
        companyInfo: {},
        searchForm: {},
        contact_list: [],
        multipleSelection: [],
        editDialogVisible: false,
        contactForm: {
            contactName: '',
            contactPhone: ''
        },
        isAdd: true,
        rules: {
            contactName: [
                {required: true, message: '请输入联系人名称', trigger: 'blur'}
            ],
            contactPhone: [
                {required: true, message: '请输入联系方式', trigger: 'blur'}
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
                contactName: ''
            };
            this.getContactList();
        },
        getContactList() {
            let selectSql = 'select * from companyContact';
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
                contactName: {
                    test: function (value) {
                        return value !== null && value !== '';
                    },
                    getSql: function () {
                        return 'and contactName like ?';
                    },
                    getValue: function (value) {
                        return '%' + value + '%';
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
            let contactList = [];
            webSqlUtils.exeSql(selectSql, paramArr).then(function (result) {
                let resultCount = result.rows.length;
                if (resultCount > 0) {
                    for (let i = 0; i < resultCount; i++) {
                        contactList.push(result.rows[i]);
                    }
                }
                _this.contact_list = contactList;
                _this.loading = false;
            }).catch(function (error) {
                webSqlUtils.commonDBReject(error, _this.$message);
            });
        },
        onSearch() {
            this.loading = true;
            this.getContactList();
        },
        onReset() {
            this.$refs['searchForm'].resetFields();
        },
        //列表数据格式化
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
            if (this.$refs['contactForm']) {
                this.$refs['contactForm'].clearValidate();
            }
            this.contactForm = {
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
            if (this.$refs['contactForm']) {
                this.$refs['contactForm'].clearValidate();
            }
            this.contactForm = {
                id: this.multipleSelection[0].id,
                contactName: this.multipleSelection[0].contactName,
                contactPhone: this.multipleSelection[0].contactPhone
            };
        },
        addOrEditContact() {
            this.$refs['contactForm'].validate((valid) => {
                if (valid) {
                    if (this.isAdd) {
                        let contactInfo = {
                            companyId: this.companyInfo.id,
                            contactName: this.contactForm.contactName,
                            contactPhone: this.contactForm.contactPhone,
                            createTime: new Date(),
                            createPerson: this.loginUser.code,
                            updateTime: new Date(),
                            updatePerson: this.loginUser.code
                        };
                        let insertSqlResult = webSqlUtils.convertForInsert('companyContact', contactInfo);
                        let _this = this;
                        webSqlUtils.exeSql(insertSqlResult.insertSql, insertSqlResult.insertValue).then(function (result) {
                            if (result.rowsAffected === 1) {
                                _this.$message.success("新增联系人成功");
                                _this.initSearch();
                            }
                        }).catch(function (error) {
                            webSqlUtils.commonDBReject(error, _this.$message);
                        });
                    } else {
                        let updateSql = 'update companyContact set contactName = ?,contactPhone = ?,updateTime = ?,updatePerson = ? where id = ?';
                        let updateParamArr = [];
                        updateParamArr.push(this.contactForm.contactName);
                        updateParamArr.push(this.contactForm.contactPhone);
                        updateParamArr.push(new Date());
                        updateParamArr.push(this.loginUser.code);
                        updateParamArr.push(this.contactForm.id);
                        let _this = this;
                        webSqlUtils.exeSql(updateSql, updateParamArr).then(function (result) {
                            if (result.rowsAffected === 1) {
                                _this.$message.success("编辑联系人成功");
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
                let deleteSql = 'delete from companyContact where id = ?';
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
                        this.$message.success("删除联系人成功");
                    } else {
                        this.$message.error("删除联系人失败");
                    }
                    this.initSearch();
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
                return '新增联系人';
            }
            return '编辑联系人';
        }
    }
});