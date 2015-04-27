var test = require('tape'),
    fs = require('fs'),
    _ = require('underscore'),
    JSON = require('JSON'),
    Mingo = require('../mingo');


var students = JSON.parse(fs.readFileSync(__dirname + '/data/students.json'));
var gradesSimple = JSON.parse(fs.readFileSync(__dirname + '/data/grades_simple.json'));


test.only("Aggregation Pipeline Operators", function (t) {

  t.test("$match operator", function (t) {
    t.plan(1);
    var result = Mingo.aggregate(students, [
      {'$match': {_id: {$in: [0, 1, 2, 3, 4]}}}
    ]);
    t.ok(result.length === 5, "can filter collection with $match");
  });

  t.test("$unwind operator", function (t) {
    t.plan(1)
    var flattened = Mingo.aggregate(students, [
      {'$unwind': '$scores'}
    ]);
    t.ok(flattened.length === 800, "can unwind array value in collection");
  });

  t.test("$project operator", function (t) {
    t.plan(13);
    var result = Mingo.aggregate(
        students,
        [
          {'$unwind': '$scores'},
          {
            '$project': {
              'name': 1,
              'type': '$scores.type',
              'details': {
                "plus10": {$add: ["$scores.score", 10]}
              }
            }
          },
          {'$limit': 1}
        ]
    );

    var fields = _.keys(result[0]);
    t.ok(fields.length === 4, "can project fields with $project");
    t.ok(_.contains(fields, 'type'), "can rename fields with $project");
    var temp = result[0]['details'];
    t.ok(_.isObject(temp) && _.keys(temp).length === 1, "can create and populate sub-documents");

    // examples from mongoDB website

    var products = [
      {"_id": 1, "item": "abc1", description: "product 1", qty: 300},
      {"_id": 2, "item": "abc2", description: "product 2", qty: 200},
      {"_id": 3, "item": "xyz1", description: "product 3", qty: 250},
      {"_id": 4, "item": "VWZ1", description: "product 4", qty: 300},
      {"_id": 5, "item": "VWZ2", description: "product 5", qty: 180}
    ];

    result = Mingo.aggregate(products, [
      {
        $project: {
          item: 1,
          qty: 1,
          qtyEq250: {$eq: ["$qty", 250]},
          _id: 0
        }
      }
    ]);
    t.deepEqual(result, [
      {"item": "abc1", "qty": 300, "qtyEq250": false},
      {"item": "abc2", "qty": 200, "qtyEq250": false},
      {"item": "xyz1", "qty": 250, "qtyEq250": true},
      {"item": "VWZ1", "qty": 300, "qtyEq250": false},
      {"item": "VWZ2", "qty": 180, "qtyEq250": false}
    ], "can project with $eq operator");

    // $cmp
    result = Mingo.aggregate(products, [
      {
        $project: {
          item: 1,
          qty: 1,
          cmpTo250: {$cmp: ["$qty", 250]},
          _id: 0
        }
      }]);
    t.deepEqual(result, [
      {"item": "abc1", "qty": 300, "cmpTo250": 1},
      {"item": "abc2", "qty": 200, "cmpTo250": -1},
      {"item": "xyz1", "qty": 250, "cmpTo250": 0},
      {"item": "VWZ1", "qty": 300, "cmpTo250": 1},
      {"item": "VWZ2", "qty": 180, "cmpTo250": -1}
    ], "can project with $cmp operator");

    result = Mingo.aggregate(
        students,
        [
          {
            '$project': {
              'name': 0
            }
          },
          {'$limit': 1}
        ]
    );

    fields = _.keys(result[0]);
    t.ok(fields.length === 2, "2/3 fields are included. Instead: " + fields.length);
    t.ok(fields.indexOf('name') === -1, "name is excluded");
    t.ok(fields.indexOf('_id') >= 0, "_id is included");
    t.ok(fields.indexOf('scores') >= 0, "score is included");

    result = Mingo.aggregate(
        students,
        [
          {
            '$project': {
              '_id': 0
            }
          },
          {'$limit': 1}
        ]
    );

    fields = _.keys(result[0]);
    t.ok(fields.length === 2, "2/3 fields are included. Instead: " + fields.length);
    t.ok(fields.indexOf('name') >= 0, "name is included");
    t.ok(fields.indexOf('_id') === -1, "_id is excluded");
    t.ok(fields.indexOf('scores') >= 0, "score is included");
  });

  t.test("$group operator", function (t) {
    t.plan(1);
    var flattened = Mingo.aggregate(students, [
      {'$unwind': '$scores'}
    ]);
    var grouped = Mingo.aggregate(
        flattened,
        [
          {
            '$group': {
              '_id': '$scores.type', 'highest': {$max: '$scores.score'},
              'lowest': {$min: '$scores.score'}, 'average': {$avg: '$scores.score'}, 'count': {$sum: 1}
            }
          }
        ]
    );
    t.ok(grouped.length === 3, "can group collection with $group");
  });

  t.test("$limit operator", function (t) {
    t.plan(1);
    var result = Mingo.aggregate(students, [
      {'$limit': 100}
    ]);
    t.ok(result.length === 100, "can limit result with $limit");
  });

  t.test("$skip operator", function (t) {
    t.plan(1);
    var result = Mingo.aggregate(students, [
      {'$skip': 100}
    ]);
    t.ok(result.length === students.length - 100, "can skip result with $skip");
  });

  t.test("$sort operator", function (t) {
    t.plan(1);
    var result = Mingo.aggregate(students, [
      {'$sort': {'_id': -1}}
    ]);
    t.ok(result[0]['_id'] === 199, "can sort collection with $sort");
  });
});

test("Arithmetic Operators", function (t) {
  t.plan(5);

  var sales = [
    {
      "_id": 1,
      "item": "abc",
      "price": 10,
      "fee": 2,
      "discount": 5,
      "quantity": 2,
      date: new Date("2014-03-01T08:00:00Z")
    },
    {
      "_id": 2,
      "item": "jkl",
      "price": 20,
      "fee": 1,
      "discount": 2,
      "quantity": 1,
      date: new Date("2014-03-01T09:00:00Z")
    },
    {
      "_id": 3,
      "item": "xyz",
      "price": 5,
      "fee": 0,
      "discount": 1,
      "quantity": 10,
      date: new Date("2014-03-15T09:00:00Z")
    }
  ];

  // $add
  var result = Mingo.aggregate(sales, [
    {$project: {item: 1, total: {$add: ["$price", "$fee"]}}}
  ]);
  t.deepEqual(result, [
    {"_id": 1, "item": "abc", "total": 12},
    {"_id": 2, "item": "jkl", "total": 21},
    {"_id": 3, "item": "xyz", "total": 5}
  ], "aggregate with $add operator");

  // $subtract
  result = Mingo.aggregate(sales, [
    {$project: {item: 1, total: {$subtract: [{$add: ["$price", "$fee"]}, "$discount"]}}}
  ]);
  t.deepEqual(result, [
    {"_id": 1, "item": "abc", "total": 7},
    {"_id": 2, "item": "jkl", "total": 19},
    {"_id": 3, "item": "xyz", "total": 4}
  ], "aggregate with $subtract operator");

  // $multiply
  result = Mingo.aggregate(sales, [
    {$project: {date: 1, item: 1, total: {$multiply: ["$price", "$quantity"]}}}
  ]);
  t.deepEqual(result, [
    {"_id": 1, "item": "abc", "date": new Date("2014-03-01T08:00:00Z"), "total": 20},
    {"_id": 2, "item": "jkl", "date": new Date("2014-03-01T09:00:00Z"), "total": 20},
    {"_id": 3, "item": "xyz", "date": new Date("2014-03-15T09:00:00Z"), "total": 50}
  ], "aggregate with $multiply operator");

  // $divide
  result = Mingo.aggregate([
    {"_id": 1, "name": "A", "hours": 80, "resources": 7},
    {"_id": 2, "name": "B", "hours": 40, "resources": 4}
  ], [
    {$project: {name: 1, workdays: {$divide: ["$hours", 8]}}}
  ]);
  t.deepEqual(result, [
    {"_id": 1, "name": "A", "workdays": 10},
    {"_id": 2, "name": "B", "workdays": 5}
  ], "aggregate with $divide operator");

  // $mod
  result = Mingo.aggregate([
    {"_id": 1, "project": "A", "hours": 80, "tasks": 7},
    {"_id": 2, "project": "B", "hours": 40, "tasks": 4}
  ], [
    {$project: {remainder: {$mod: ["$hours", "$tasks"]}}}
  ]);
  t.deepEqual(result, [
    {"_id": 1, "remainder": 3},
    {"_id": 2, "remainder": 0}
  ], "aggregate with $mod operator");

  t.end();

});

test("String Operators", function (t) {
  t.plan(5);
  var inventory = [
    {"_id": 1, "item": "ABC1", quarter: "13Q1", "description": "product 1"},
    {"_id": 2, "item": "ABC2", quarter: "13Q4", "description": "product 2"},
    {"_id": 3, "item": "XYZ1", quarter: "14Q2", "description": null}
  ];

  // $concat
  var result = Mingo.aggregate(inventory, [
    {$project: {itemDescription: {$concat: ["$item", " - ", "$description"]}}}
  ]);

  t.deepEqual(result, [
    {"_id": 1, "itemDescription": "ABC1 - product 1"},
    {"_id": 2, "itemDescription": "ABC2 - product 2"},
    {"_id": 3, "itemDescription": null}
  ], "aggregate with $concat");

  // $substr
  result = Mingo.aggregate(inventory, [
    {
      $project: {
        item: 1,
        yearSubstring: {$substr: ["$quarter", 0, 2]},
        quarterSubtring: {$substr: ["$quarter", 2, -1]}
      }
    }
  ]);

  t.deepEqual(result, [
    {"_id": 1, "item": "ABC1", "yearSubstring": "13", "quarterSubtring": "Q1"},
    {"_id": 2, "item": "ABC2", "yearSubstring": "13", "quarterSubtring": "Q4"},
    {"_id": 3, "item": "XYZ1", "yearSubstring": "14", "quarterSubtring": "Q2"}
  ], "aggregate with $substr");

  // for casing functions
  var inventoryMixedCase = [
    {"_id": 1, "item": "ABC1", quarter: "13Q1", "description": "PRODUCT 1"},
    {"_id": 2, "item": "abc2", quarter: "13Q4", "description": "Product 2"},
    {"_id": 3, "item": "xyz1", quarter: "14Q2", "description": null}
  ];

  // $toLower
  result = Mingo.aggregate(inventoryMixedCase, [
    {
      $project: {
        item: {$toLower: "$item"},
        description: {$toLower: "$description"}
      }
    }
  ]);

  t.deepEqual(result, [
    {"_id": 1, "item": "abc1", "description": "product 1"},
    {"_id": 2, "item": "abc2", "description": "product 2"},
    {"_id": 3, "item": "xyz1", "description": ""}
  ], "aggregate with $toLower");

  // $toUpper
  result = Mingo.aggregate(inventoryMixedCase, [
    {
      $project: {
        item: {$toUpper: "$item"},
        description: {$toUpper: "$description"}
      }
    }
  ]);

  t.deepEqual(result, [
    {"_id": 1, "item": "ABC1", "description": "PRODUCT 1"},
    {"_id": 2, "item": "ABC2", "description": "PRODUCT 2"},
    {"_id": 3, "item": "XYZ1", "description": ""}
  ], "aggregate with $toUpper");

  // $strcasecmp
  result = Mingo.aggregate(inventory, [
    {
      $project: {
        item: 1,
        comparisonResult: {$strcasecmp: ["$quarter", "13q4"]}
      }
    }
  ]);
  t.deepEqual(result, [
    {"_id": 1, "item": "ABC1", "comparisonResult": -1},
    {"_id": 2, "item": "ABC2", "comparisonResult": 0},
    {"_id": 3, "item": "XYZ1", "comparisonResult": 1}
  ], "aggregate with $strcasecmp");

  t.end();
});

test("Set Operators", function (t) {
  t.plan(7);

  var experiments = [
    {"_id": 1, "A": ["red", "blue"], "B": ["red", "blue"]},
    {"_id": 2, "A": ["red", "blue"], "B": ["blue", "red", "blue"]},
    {"_id": 3, "A": ["red", "blue"], "B": ["red", "blue", "green"]},
    {"_id": 4, "A": ["red", "blue"], "B": ["green", "red"]},
    {"_id": 5, "A": ["red", "blue"], "B": []},
    {"_id": 6, "A": ["red", "blue"], "B": [["red"], ["blue"]]},
    {"_id": 7, "A": ["red", "blue"], "B": [["red", "blue"]]},
    {"_id": 8, "A": [], "B": []},
    {"_id": 9, "A": [], "B": ["red"]}
  ];

  // equality
  var result = Mingo.aggregate(experiments, [
    {$project: {A: 1, B: 1, sameElements: {$setEquals: ["$A", "$B"]}, _id: 0}}
  ]);
  t.deepEqual(result, [
    {"A": ["red", "blue"], "B": ["red", "blue"], "sameElements": true},
    {"A": ["red", "blue"], "B": ["blue", "red", "blue"], "sameElements": true},
    {"A": ["red", "blue"], "B": ["red", "blue", "green"], "sameElements": false},
    {"A": ["red", "blue"], "B": ["green", "red"], "sameElements": false},
    {"A": ["red", "blue"], "B": [], "sameElements": false},
    {"A": ["red", "blue"], "B": [["red"], ["blue"]], "sameElements": false},
    {"A": ["red", "blue"], "B": [["red", "blue"]], "sameElements": false},
    {"A": [], "B": [], "sameElements": true},
    {"A": [], "B": ["red"], "sameElements": false}
  ], "aggregate with $setEquals");

  // intersection
  result = Mingo.aggregate(experiments, [
    {$project: {A: 1, B: 1, commonToBoth: {$setIntersection: ["$A", "$B"]}, _id: 0}}
  ]);
  t.deepEqual(result, [
    {"A": ["red", "blue"], "B": ["red", "blue"], "commonToBoth": ["red", "blue"]},
    {"A": ["red", "blue"], "B": ["blue", "red", "blue"], "commonToBoth": ["red", "blue"]},
    {"A": ["red", "blue"], "B": ["red", "blue", "green"], "commonToBoth": ["red", "blue"]},
    {"A": ["red", "blue"], "B": ["green", "red"], "commonToBoth": ["red"]},
    {"A": ["red", "blue"], "B": [], "commonToBoth": []},
    {"A": ["red", "blue"], "B": [["red"], ["blue"]], "commonToBoth": []},
    {"A": ["red", "blue"], "B": [["red", "blue"]], "commonToBoth": []},
    {"A": [], "B": [], "commonToBoth": []},
    {"A": [], "B": ["red"], "commonToBoth": []}
  ], "aggregate with $setIntersection");

  // union
  result = Mingo.aggregate(experiments, [
    {$project: {A: 1, B: 1, allValues: {$setUnion: ["$A", "$B"]}, _id: 0}}
  ]);
  t.deepEqual(result, [
    {"A": ["red", "blue"], "B": ["red", "blue"], "allValues": ["red", "blue"]},
    {"A": ["red", "blue"], "B": ["blue", "red", "blue"], "allValues": ["red", "blue"]},
    {"A": ["red", "blue"], "B": ["red", "blue", "green"], "allValues": ["red", "blue", "green"]},
    {"A": ["red", "blue"], "B": ["green", "red"], "allValues": ["red", "blue", "green"]},
    {"A": ["red", "blue"], "B": [], "allValues": ["red", "blue"]},
    {"A": ["red", "blue"], "B": [["red"], ["blue"]], "allValues": ["red", "blue", ["red"], ["blue"]]},
    {"A": ["red", "blue"], "B": [["red", "blue"]], "allValues": ["red", "blue", ["red", "blue"]]},
    {"A": [], "B": [], "allValues": []},
    {"A": [], "B": ["red"], "allValues": ["red"]}
  ], "aggregate with $setUnion");

  // difference
  result = Mingo.aggregate(experiments, [
    {$project: {A: 1, B: 1, inBOnly: {$setDifference: ["$B", "$A"]}, _id: 0}}
  ]);
  t.deepEqual(result, [
    {"A": ["red", "blue"], "B": ["red", "blue"], "inBOnly": []},
    {"A": ["red", "blue"], "B": ["blue", "red", "blue"], "inBOnly": []},
    {"A": ["red", "blue"], "B": ["red", "blue", "green"], "inBOnly": ["green"]},
    {"A": ["red", "blue"], "B": ["green", "red"], "inBOnly": ["green"]},
    {"A": ["red", "blue"], "B": [], "inBOnly": []},
    {"A": ["red", "blue"], "B": [["red"], ["blue"]], "inBOnly": [["red"], ["blue"]]},
    {"A": ["red", "blue"], "B": [["red", "blue"]], "inBOnly": [["red", "blue"]]},
    {"A": [], "B": [], "inBOnly": []},
    {"A": [], "B": ["red"], "inBOnly": ["red"]}
  ], "aggregate with $setDifference");

  // subset
  result = Mingo.aggregate(experiments, [
    {$project: {A: 1, B: 1, AisSubset: {$setIsSubset: ["$A", "$B"]}, _id: 0}}
  ]);
  t.deepEqual(result, [
    {"A": ["red", "blue"], "B": ["red", "blue"], "AisSubset": true},
    {"A": ["red", "blue"], "B": ["blue", "red", "blue"], "AisSubset": true},
    {"A": ["red", "blue"], "B": ["red", "blue", "green"], "AisSubset": true},
    {"A": ["red", "blue"], "B": ["green", "red"], "AisSubset": false},
    {"A": ["red", "blue"], "B": [], "AisSubset": false},
    {"A": ["red", "blue"], "B": [["red"], ["blue"]], "AisSubset": false},
    {"A": ["red", "blue"], "B": [["red", "blue"]], "AisSubset": false},
    {"A": [], "B": [], "AisSubset": true},
    {"A": [], "B": ["red"], "AisSubset": true}
  ], "aggregate with $setIsSubset");

  var surveyData = [
    {"_id": 1, "responses": [true]},
    {"_id": 2, "responses": [true, false]},
    {"_id": 3, "responses": []},
    {"_id": 4, "responses": [1, true, "seven"]},
    {"_id": 5, "responses": [0]},
    {"_id": 6, "responses": [[]]},
    {"_id": 7, "responses": [[0]]},
    {"_id": 8, "responses": [[false]]},
    {"_id": 9, "responses": [null]},
    {"_id": 10, "responses": [undefined]}
  ];

  // any element true
  result = Mingo.aggregate(surveyData, [
    {$project: {responses: 1, isAnyTrue: {$anyElementTrue: ["$responses"]}, _id: 0}}
  ]);
  t.deepEqual(result, [
    {"responses": [true], "isAnyTrue": true},
    {"responses": [true, false], "isAnyTrue": true},
    {"responses": [], "isAnyTrue": false},
    {"responses": [1, true, "seven"], "isAnyTrue": true},
    {"responses": [0], "isAnyTrue": false},
    {"responses": [[]], "isAnyTrue": true},
    {"responses": [[0]], "isAnyTrue": true},
    {"responses": [[false]], "isAnyTrue": true},
    {"responses": [null], "isAnyTrue": false},
    {"responses": [undefined], "isAnyTrue": false}
  ], "aggregate with $anyElementTrue");

  // all elements true
  result = Mingo.aggregate(surveyData, [
    {$project: {responses: 1, isAllTrue: {$allElementsTrue: ["$responses"]}, _id: 0}}
  ]);
  t.deepEqual(result, [
    {"responses": [true], "isAllTrue": true},
    {"responses": [true, false], "isAllTrue": false},
    {"responses": [], "isAllTrue": true},
    {"responses": [1, true, "seven"], "isAllTrue": true},
    {"responses": [0], "isAllTrue": false},
    {"responses": [[]], "isAllTrue": true},
    {"responses": [[0]], "isAllTrue": true},
    {"responses": [[false]], "isAllTrue": true},
    {"responses": [null], "isAllTrue": false},
    {"responses": [undefined], "isAllTrue": false}
  ], "aggregate with $allElementsTrue");

  t.end();

});