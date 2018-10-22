const whereSql = {
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
    orderNo: {
        test: function (value) {
            return value !== null && value !== '';
        },
        getSql: function () {
            return 'and orderNo like ?';
        },
        getValue: function (value) {
            return '%' + value + '%';
        }
    },
    customerId: {
        test: function (value) {
            return value !== null && value !== '';
        },
        getSql: function () {
            return 'and customerId = ?';
        },
        getValue: function (value) {
            return value;
        }
    },
    isPrinted: {
        test: function (value) {
            return value !== null && value !== '';
        },
        getSql: function () {
            return 'and isPrinted = ?';
        },
        getValue: function (value) {
            return value;
        }
    }
};

// 删除主表sql
const deleteSql = 'delete from delivery where companyId = ? and id = ?';
// 删除明细sql
const deleteDetailSql = 'delete from deliveryDetail where companyId = ? and deliveryId = ?';

let deliveryManager = {
    findPageByQuery(query) {
        let pageResult = {};

        let countSql = 'select count(id) as c from delivery';
        let countParamArr = [];
        let selectSql = 'select * from delivery';
        let selectParamArr = [];
        let whereResult = webSqlUtils.convertForSelect(query, whereSql);
        if (whereResult) {
            countSql = countSql + whereResult.paramStr;
            countParamArr = whereResult.paramArr.slice();
            selectSql = selectSql + whereResult.paramStr;
            selectParamArr = whereResult.paramArr.slice();
        }
        if (!query.pageSize) {
            query.pageSize = 10;
        }
        if (!query.pageNum) {
            query.pageNum = 1;
        }
        let offset = (query.pageNum - 1) * query.pageSize;

        selectSql += ' order by id desc limit ?,? ';
        selectParamArr.push(offset);
        selectParamArr.push(query.pageSize);

        return new Promise(function (resolve, reject) {
            webSqlUtils.database.readTransaction((tx) => {
                tx.executeSql(countSql, countParamArr, (tx, resultSet) => {
                    pageResult.totalCount = resultSet.rows[0].c;
                }, (tx, error) => {
                    pageResult.message = '查询总记录数失败';
                    console.log(error);
                    return true;
                });
                tx.executeSql(selectSql, selectParamArr, (tx, resultSet) => {
                    let deliveryList = [];
                    let length = resultSet.rows.length;
                    if (length > 0) {
                        for (let i = 0; i < length; i++) {
                            let deliveryVO = resultSet.rows[i];
                            deliveryManager.setCompanyContact(tx, deliveryVO);
                            deliveryManager.setCustomer(tx, deliveryVO);
                            deliveryList.push(deliveryVO);
                        }
                    }
                    pageResult.data = deliveryList;
                }, (tx, error) => {
                    pageResult.message = '分页查询记录失败';
                    console.log(error);
                    return true;
                });
            }, (error) => {
                reject(pageResult);
                console.log(error);
            }, () => {
                resolve(pageResult);
            });
        });
    },

    setCompanyContact(tx, deliveryVO) {
        let selectSql = 'select * from companyContact where id = ?';
        let paramArr = [deliveryVO.companyContactId];
        tx.executeSql(selectSql, paramArr, (tx, resultSet) => {
            if (resultSet.rows.length === 1) {
                deliveryVO.companyContact = resultSet.rows[0];
            }
        }, (tx, error) => {
            console.log(error);
        });
    },

    setCustomer(tx, deliveryVO) {
        let selectSql = 'select * from customer where id = ?';
        let paramArr = [deliveryVO.customerId];
        tx.executeSql(selectSql, paramArr, (tx, resultSet) => {
            if (resultSet.rows.length === 1) {
                deliveryVO.customer = resultSet.rows[0];
            }
        }, (tx, error) => {
            console.log(error);
        });
    },

    findWithDetailById(id) {
        let result = {};
        let selectDeliverySql = 'select * from delivery where id = ?';
        let deliveryParamArr = [id];
        let selectDetailSql = 'select * from deliveryDetail where deliveryId = ?';
        let detailParamArr = [id];

        return new Promise(function (resolve, reject) {
            webSqlUtils.database.readTransaction((tx) => {
                tx.executeSql(selectDeliverySql, deliveryParamArr, (tx, resultSet) => {
                    if (resultSet.rows.length > 0) {
                        let deliveryVO = resultSet.rows[0];
                        deliveryManager.setCompanyContact(tx, deliveryVO);
                        deliveryManager.setCustomer(tx, deliveryVO);
                        result.delivery = deliveryVO;
                    }
                }, (tx, error) => {
                    result.message = '查询主表失败';
                    console.log(result.message);
                    console.log(error);
                    return true;
                });
                tx.executeSql(selectDetailSql, detailParamArr, (tx, resultSet) => {
                    let length = resultSet.rows.length;
                    if (length > 0) {
                        let deliveryDetailList = [];
                        for (let i = 0; i < length; i++) {
                            let deliveryDetailVO = resultSet.rows[i];
                            deliveryManager.setProduct(tx, deliveryDetailVO);
                            deliveryManager.doCalculate(deliveryDetailVO);
                            deliveryDetailList.push(deliveryDetailVO);
                        }
                        result.deliveryDetailList = deliveryDetailList;
                    }
                }, (tx, error) => {
                    result.message = '查询明细失败';
                    console.log(result.message);
                    console.log(error);
                    return true;
                });
            }, (error) => {
                console.log(error);
                reject(result);
            }, () => {
                resolve(result);
            });
        });
    },

    setProduct(tx, deliveryDetailVO) {
        let selectSql = 'select * from product where id = ?';
        let paramArr = [deliveryDetailVO.productId];
        tx.executeSql(selectSql, paramArr, (tx, resultSet) => {
            if (resultSet.rows.length === 1) {
                deliveryDetailVO.product = resultSet.rows[0];
            }
        }, (tx, error) => {
            console.log(error);
        });
    },

    doCalculate(deliveryDetailVO) {
        let packageQuantity = _.ceil(deliveryDetailVO.quantity / deliveryDetailVO.packageSize);
        let totalPrice = deliveryDetailVO.price * deliveryDetailVO.quantity;
        deliveryDetailVO.packageQuantity = packageQuantity;
        deliveryDetailVO.totalPrice = totalPrice;
    },

    add(delivery, deliveryDetailList, loginUser) {
        let result = {};

        return new Promise((resolve, reject) => {
            webSqlUtils.database.transaction((tx) => {
                // 先插入主表
                let deliveryDO = {
                    companyId: delivery.companyId,
                    orderNo: delivery.orderNo,
                    stockOutDate: delivery.stockOutDate,
                    companyContactId: delivery.companyContactId,
                    customerId: delivery.customerId,
                    isPrinted: 0,
                    createTime: new Date(),
                    createPerson: loginUser.code,
                    updateTime: new Date(),
                    updatePerson: loginUser.code
                };
                let insertSqlResult = webSqlUtils.convertForInsert('delivery', deliveryDO);
                tx.executeSql(insertSqlResult.insertSql, insertSqlResult.insertValue, (tx, resultSet) => {
                    console.log('订单号-' + delivery.orderNo + '-主表新增成功');
                    console.log(resultSet);
                    let deliveryId = resultSet.insertId;

                    deliveryDetailList.forEach((deliveryDetail) => {
                        deliveryDetail.deliveryId = deliveryId;
                    });
                    // 插入明细列表
                    this.insertDetailList(tx, deliveryDetailList, loginUser, result);
                }, (tx, error) => {
                    result.message = '订单号-' + delivery.orderNo + '-主表新增失败';
                    console.log(result.message);
                    console.log(error);
                    return true;
                });
            }, function (error) {
                console.log(error);
                reject(result);
            }, () => {
                result.message = "新增成功";
                resolve(result)
            });
        });
    },

    update(delivery, deliveryDetailList, loginUser) {
        let result = {};

        return new Promise((resolve, reject) => {
            webSqlUtils.database.transaction((tx) => {
                // 先删除旧明细
                this.deleteDetailList(tx, delivery.companyId, delivery.id, result, (tx) => {
                    // 删除旧明细成功后
                    // 更新主表
                    let updateSql = 'update delivery set stockOutDate = ?, companyContactId = ?, customerId = ?, updateTime = ?, updatePerson = ? where id = ?';
                    let updateParamArr = [];
                    updateParamArr.push(delivery.stockOutDate);
                    updateParamArr.push(delivery.companyContactId);
                    updateParamArr.push(delivery.customerId);
                    updateParamArr.push(new Date());
                    updateParamArr.push(loginUser.code);
                    updateParamArr.push(delivery.id);

                    tx.executeSql(updateSql, updateParamArr, (tx, resultSet) => {
                        console.log('id-' + delivery.id + '-更新主表成功');
                        console.log(resultSet);
                    }, (tx, error) => {
                        result.message = 'id-' + delivery.id + '-更新主表失败';
                        console.log(result.message);
                        console.log(error);
                        return true;
                    });

                    // 插入明细列表
                    this.insertDetailList(tx, deliveryDetailList, loginUser, result);
                });
            }, function (error) {
                console.log(error);
                reject(result);
            }, () => {
                result.message = "更新成功";
                resolve(result)
            });
        });
    },

    delete(companyId, id) {
        return this.batchDelete(companyId, [id]);
    },

    batchDelete(companyId, ids) {
        let result = {};

        return new Promise((resolve, reject) => {
            webSqlUtils.database.transaction((tx) => {
                ids.forEach((deliveryId) => {
                    let deleteParamArr = [];
                    deleteParamArr.push(companyId);
                    deleteParamArr.push(deliveryId);

                    tx.executeSql(deleteSql, deleteParamArr, (tx, resultSet) => {
                        console.log('id-' + deliveryId + '-删除主表成功');
                        console.log(resultSet);
                    }, (tx, error) => {
                        result.message = 'id-' + deliveryId + '-删除主表失败';
                        console.log(result.message);
                        console.log(error);
                        return true;
                    });

                    this.deleteDetailList(tx, companyId, deliveryId, result);
                });
            }, function (error) {
                console.log(error);
                reject(result);
            }, () => {
                result.message = "删除成功";
                resolve(result)
            });
        });
    },

    // 删除明细
    deleteDetailList(tx, companyId, deliveryId, result, successCallback) {
        let deleteDetailParamArr = [];
        deleteDetailParamArr.push(companyId);
        deleteDetailParamArr.push(deliveryId);

        tx.executeSql(deleteDetailSql, deleteDetailParamArr, function (tx, resultSet) {
            console.log('id-' + deliveryId + '-删除明细成功');
            console.log(resultSet);
            if (successCallback) {
                successCallback(tx);
            }
        }, function (tx, error) {
            result.message = 'id-' + deliveryId + '-删除明细失败';
            console.log(result.message);
            console.log(error);
            return true;
        });
    },

    // 插入明细
    insertDetailList(tx, deliveryDetailList, loginUser, result) {
        deliveryDetailList.forEach((deliveryDetail) => {
            let deliveryDetailDO = {
                companyId: deliveryDetail.companyId,
                deliveryId: deliveryDetail.deliveryId,
                productId: deliveryDetail.productId,
                quantity: deliveryDetail.quantity,
                price: deliveryDetail.price,
                packageSize: deliveryDetail.packageSize,
                remark: deliveryDetail.remark,
                createTime: new Date(),
                createPerson: loginUser.code,
                updateTime: new Date(),
                updatePerson: loginUser.code
            };
            let insertSqlResult = webSqlUtils.convertForInsert('deliveryDetail', deliveryDetailDO);
            tx.executeSql(insertSqlResult.insertSql, insertSqlResult.insertValue, (tx, resultSet) => {
                console.log('productId-' + deliveryDetail.productId + '-明细新增成功');
                console.log(resultSet);
            }, (tx, error) => {
                result.message = 'productId-' + deliveryDetail.productId + '-明细新增失败';
                console.log(result.message);
                console.log(error);
                return true;
            });
        });
    },
    generateOrderNo() {
        let orderNo = 'HY' + moment().format('YYYYMMDD');
        let orderNoSuffix = '000000';
        let orderNum = this.getOrderNum();
        orderNoSuffix = orderNoSuffix.substring(0, 6 - orderNum.length) + orderNum;
        orderNo = orderNo + orderNoSuffix;
        return orderNo;
    },
    getOrderNum() {
        let orderNoKey = 'ORDER_NO';
        let orderNum = localStorage.getItem(orderNoKey);
        if (orderNum) {
            let orderNumInt = parseInt(orderNum);
            if (orderNumInt >= 999999) {
                orderNumInt = 1;
            } else {
                orderNumInt = orderNumInt + 1;
            }
            orderNum = orderNumInt.toString();
        } else {
            orderNum = '1';
        }
        localStorage.setItem(orderNoKey, orderNum);
        return orderNum;
    }
};