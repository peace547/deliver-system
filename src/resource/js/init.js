// 'drop table IF EXISTS user',
const createTableOptions = [{
    tableName: 'user',
    desc: '用户表',
    sql: ['drop table IF EXISTS user','create table IF not EXISTS user(' +
    'id integer primary key autoincrement,' +
    'companyId integer not null,' +
    'code text not null unique,' +
    'name text not null,' +
    'sex integer not null,' +
    'phone text not null,' +
    'password text not null,' +
    'status integer not null,' +
    'createTime datetime not null,' +
    'createPerson text not null,' +
    'updateTime datetime not null,' +
    'updatePerson text not null);']
}, {
    tableName: 'customer',
    desc: '客户表',
    sql: ['drop table IF EXISTS customer','create table IF not EXISTS customer(' +
    'id integer primary key autoincrement,' +
    'companyId integer not null,' +
    'name text not null,' +
    'address text not null,' +
    'contactName text not null,' +
    'contactPhone text not null,' +
    'status integer not null,' +
    'createTime datetime not null,' +
    'createPerson text not null,' +
    'updateTime datetime not null,' +
    'updatePerson text not null);']
}, {
    tableName: 'companyContact',
    desc: '公司联系人表',
    sql: ['drop table IF EXISTS companyContact','create table IF not EXISTS companyContact(' +
    'id integer primary key autoincrement,' +
    'companyId integer not null,' +
    'contactName text not null,' +
    'contactPhone text not null,' +
    'createTime datetime not null,' +
    'createPerson text not null,' +
    'updateTime datetime not null,' +
    'updatePerson text not null);']
}, {
    tableName: 'product',
    desc: '产品表',
    sql: ['drop table IF EXISTS product','create table IF not EXISTS product(' +
    'id integer primary key autoincrement,' +
    'companyId integer not null,' +
    'code text not null unique,' +
    'name text not null,' +
    'specification text not null,' +
    'unit text not null,' +
    'status integer not null,' +
    'createTime datetime not null,' +
    'createPerson text not null,' +
    'updateTime datetime not null,' +
    'updatePerson text not null);']
}, {
    tableName: 'delivery',
    desc: '发货单表',
    sql: ['drop table IF EXISTS delivery','create table IF not EXISTS delivery(' +
    'id integer primary key autoincrement,' +
    'companyId integer not null,' +
    'orderNo text not null unique,' +
    'stockOutDate datetime not null,' +
    'companyContactId integer not null,' +
    'customerId integer not null,' +
    'isPrinted integer not null,' +
    'createTime datetime not null,' +
    'createPerson text not null,' +
    'updateTime datetime not null,' +
    'updatePerson text not null);']
}, {
    tableName: 'deliveryDetail',
    desc: '发货单明细表',
    sql: ['drop table IF EXISTS deliveryDetail','create table IF not EXISTS deliveryDetail(' +
    'id integer primary key autoincrement,' +
    'companyId integer not null,' +
    'deliveryId integer not null,' +
    'productId integer not null,' +
    'quantity integer not null,' +
    'price integer not null,' +
    'packageSize integer not null,' +
    'remark text,' +
    'createTime datetime not null,' +
    'createPerson text not null,' +
    'updateTime datetime not null,' +
    'updatePerson text not null);']
}];

new Vue({
    el: '#app',
    data: {
        userInfo: {},
        company: {
            id: 1,
            name: '',
            address: '',
            createTime: '',
            createPerson: '',
            updateTime: '',
            updatePerson: ''
        },
        tables: createTableOptions,
        createTableForm: {
            checkedTables: []
        },
        addCompanyForm: {
            name: '',
            address: ''
        },
        rules: {
            name: [
                {required: true, message: '请输入公司名称', trigger: 'blur'}
            ],
            address: [
                {required: true, message: '请输入公司地址', trigger: 'blur'}
            ]
        }
    },
    mounted() {
        this.userInfo = JSON.parse(sessionStorage.getItem('userInfo'));
        if (!this.userInfo || this.userInfo.code !== 'admin') {
            window.parent.location.href = "../index/login.html";
            return false;
        }
        // 打开数据库连接
        webSqlUtils.openDb();
        if(!webSqlUtils.database){
            this.$message.error('链接数据库异常');
        }
    },
    methods: {
        resetAddCompanyForm() {
            this.$refs['addCompanyForm'].resetFields();
        },
        resetCreateTableForm() {
            this.createTableForm.checkedTables = [];
        },
        addCompany() {
            this.$refs['addCompanyForm'].validate((valid) => {
                if (valid) {
                    let now = new Date();
                    let company = JSON.parse(localStorage.getItem("companyInfo"));
                    console.log(company);
                    if (!company) {
                        company = this.company;
                        company.createPerson = this.userInfo.code;
                        company.createTime = now;
                    }
                    company.name = this.addCompanyForm.name;
                    company.address = this.addCompanyForm.address;
                    company.updatePerson = this.userInfo.code;
                    company.updateTime = now;
                    localStorage.setItem('companyInfo', JSON.stringify(company));
                    this.$message.success('公司入驻成功');
                } else {
                    return false;
                }
            });
        },
        createTables() {
            let checkedCount = this.createTableForm.checkedTables.length;
            if (checkedCount === 0) {
                this.$message.error('请选择要创建的表');
                return false;
            }
            let message = this.$message;
            for (let i = 0; i < checkedCount; i++) {
                let table = this.tables[this.createTableForm.checkedTables[i]];
                table.sql.forEach((sql, index)=>{
                    webSqlUtils.exeSql(sql, []).then(function (result) {
                        console.log(table.desc + 'sql' + index + '执行成功');
                    }).catch(function (error){
                        webSqlUtils.commonDBReject(error, message);
                    });
                });
            }
        }
    }
});