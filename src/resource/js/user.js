const userStatus = [{code: 1, desc: '启用'}, {code: 0, desc: '禁用'}];
const userSex = [{code: 1, desc: '男'}, {code: 0, desc: '女'}];
const defaultPassword = '123456';

new Vue({
    el: '#app',
    data: {
        loading: true,
        loginUser: {},
        companyInfo: {},
        statusOptions: userStatus,
        sexOptions: userSex,
        searchForm: {},
        user_list: [],
        multipleSelection: [],
        editDialogVisible: false,
        userForm: {
            code: '',
            name: '',
            sex: 1,
            phone: ''
        },
        isAdd: true,
        rules: {
            code: [
                {required: true, message: '请输入用户编码', trigger: 'blur'}
            ],
            name: [
                {required: true, message: '请输入用户名称', trigger: 'blur'}
            ],
            phone: [
                {required: true, message: '请输入联系方式', trigger: 'blur'}
            ]
        }
    },
    created() {
        this.loginUser = JSON.parse(sessionStorage.getItem('userInfo'));
        if (!this.loginUser || this.loginUser.code !== 'admin') {
            window.parent.location.href = "../index/login.html";
            return false;
        }
        this.companyInfo = JSON.parse(localStorage.getItem('companyInfo'));
        if (!this.companyInfo) {
            window.location.href = "../system/init.html";
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
            this.getUserList();
        },
        getUserList() {
            let selectSql = 'select * from user';
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
            let userList = [];
            webSqlUtils.exeSql(selectSql, paramArr).then(function (result) {
                let resultCount = result.rows.length;
                if (resultCount > 0) {
                    for (let i = 0; i < resultCount; i++) {
                        userList.push(result.rows[i]);
                    }
                }
                _this.user_list = userList;
                _this.loading = false;
            }).catch(function (error) {
                webSqlUtils.commonDBReject(error, _this.$message);
            });
        },
        onSearch() {
            this.loading = true;
            this.getUserList();
        },
        onReset() {
            this.$refs['searchForm'].resetFields();
        },
        //列表数据格式化
        sexFormatter(row, column, cellValue, index) {
            let sex = _.find(userSex, (o) => {
                return o.code === cellValue;
            });
            return sex.desc;
        },
        statusFormatter(row, column, cellValue, index) {
            let status = _.find(userStatus, {code: cellValue});
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
            if (this.$refs['userForm']) {
                this.$refs['userForm'].clearValidate();
            }
            this.userForm = {
                code: '',
                name: '',
                sex: 1,
                phone: ''
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
            if (this.$refs['userForm']) {
                this.$refs['userForm'].clearValidate();
            }
            this.userForm = {
                id: this.multipleSelection[0].id,
                code: this.multipleSelection[0].code,
                name: this.multipleSelection[0].name,
                sex: this.multipleSelection[0].sex,
                phone: this.multipleSelection[0].phone
            };
        },
        addOrEditUser() {
            this.$refs['userForm'].validate((valid) => {
                if (valid) {
                    if (this.isAdd) {
                        let userInfo = {
                            companyId: this.companyInfo.id,
                            code: this.userForm.code,
                            name: this.userForm.name,
                            sex: this.userForm.sex,
                            phone: this.userForm.phone,
                            password: defaultPassword,
                            status: 1,
                            createTime: new Date(),
                            createPerson: this.loginUser.code,
                            updateTime: new Date(),
                            updatePerson: this.loginUser.code
                        };
                        let insertSqlResult = webSqlUtils.convertForInsert('user', userInfo);
                        let _this = this;
                        webSqlUtils.exeSql(insertSqlResult.insertSql, insertSqlResult.insertValue).then(function (result) {
                            if (result.rowsAffected === 1) {
                                _this.$message.success("新增用户成功");
                                _this.initSearch();
                            }
                        }).catch(function (error) {
                            webSqlUtils.commonDBReject(error, _this.$message);
                        });
                    } else {
                        let updateSql = 'update user set name = ?,sex = ?,phone = ?,updateTime = ?,updatePerson = ? where id = ?';
                        let updateParamArr = [];
                        updateParamArr.push(this.userForm.name);
                        updateParamArr.push(this.userForm.sex);
                        updateParamArr.push(this.userForm.phone);
                        updateParamArr.push(new Date());
                        updateParamArr.push(this.loginUser.code);
                        updateParamArr.push(this.userForm.id);
                        let _this = this;
                        webSqlUtils.exeSql(updateSql, updateParamArr).then(function (result) {
                            if (result.rowsAffected === 1) {
                                _this.$message.success("编辑用户成功");
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
                let deleteSql = 'delete from user where id = ?';
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
                        this.$message.success("删除用户成功");
                    } else {
                        this.$message.error("删除用户失败");
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
                confirmMsg = '确定要启用该用户？';
                updateStatus = 1;
            } else {
                confirmMsg = '确定要禁用该用户？';
                updateStatus = 0;
            }

            this.$confirm(confirmMsg, '提示', {
                confirmButtonText: '确定',
                cancelButtonText: '取消',
                type: 'warning'
            }).then(() => {
                let updateSql = 'update user set status = ?,updateTime = ?, updatePerson = ? where id = ?';
                let updateParamArr = [];
                updateParamArr.push(updateStatus);
                updateParamArr.push(new Date());
                updateParamArr.push(this.loginUser.code);
                updateParamArr.push(row.id);
                webSqlUtils.exeSql(updateSql, updateParamArr).then((result) => {
                    if (result.rowsAffected === 1) {
                        this.$message.success("修改用户状态成功");
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
                return '新增用户';
            }
            return '编辑用户';
        }
    }
});