let webSqlUtils = {
    dbConfig: {
        name: 'dms',
        version: '1.0',
        displayName: '发货管理系统',
        estimatedSize: 5242880
    },
    /** 数据库对象 */
    database: {},

    /**
     * 连接数据库
     */
    openDb() {
        this.database = openDatabase(this.dbConfig.name, this.dbConfig.version, this.dbConfig.displayName, this.dbConfig.estimatedSize, function (db) {
            console.log('连接数据库成功！');
        });
    },

    convertForSelect(params, sqlConfigs) {
        let result = {};
        let paramStr = '';
        let paramArr = [];
        for (let key in sqlConfigs) {
            if (sqlConfigs.hasOwnProperty(key)) {
                let sqlConfig = sqlConfigs[key];
                let value = params[key];
                if (typeof(value) !== "undefined") {
                    if (sqlConfig.test(value)) {
                        paramStr = paramStr + sqlConfig.getSql();
                        paramArr.push(sqlConfig.getValue(value));
                    }
                }
            }
        }
        if (paramStr !== '') {
            if (paramStr.startsWith('and') || paramStr.startsWith('AND')) {
                paramStr = paramStr.substr(3);
            }
            if (paramStr.startsWith('or') || paramStr.startsWith('OR')) {
                paramStr = paramStr.substr(2);
            }
            paramStr = ' where' + paramStr;
            result.paramStr = paramStr;
            result.paramArr = paramArr;
            return result;
        }
        return null;
    },

    convertForInsert(tableName, insertObj) {
        let result = {};
        let insertSql = 'insert into ' + tableName + '(';
        let paramsStr = '';
        let valuesStr = 'values(';
        let valuesArr = [];
        for (let key in insertObj) {
            if (insertObj.hasOwnProperty(key)) {
                paramsStr = paramsStr + key + ',';
                valuesStr += '?,';
                valuesArr.push(insertObj[key]);
            }
        }
        insertSql += paramsStr.substr(0, paramsStr.length - 1) + ') ';
        insertSql += valuesStr.substr(0, valuesStr.length - 1) + ')';

        result.insertSql = insertSql;
        result.insertValue = valuesArr;
        return result;
    },

    exeSql(sql, paramArr) {
        return new Promise(function (resolve, reject) {
            webSqlUtils.database.transaction(function (tx) {
                tx.executeSql(sql, paramArr, function (tx, resultSet) {
                    resolve(resultSet);
                }, function (tx, error) {
                    reject(error);
                });
            });
        });
    },

    commonDBReject(error, message) {
        console.log(error);
        message.error('数据库操作失败：' + error.code + ':' + error.message);
    }
};