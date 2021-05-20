# files library
* write files to disc
* use mongodb db.global.metaFiles to store version and meta infos


### path structures
Examples

```
files/2018/offers/march
files/2018/invoices/march
files/2018/purchases/march
files/2018/articles/march
files/2018/accounts/

files/volume1/2018/accounts/
files/volume1/2018/invoices/51

```

Parts of the path:
* prefix (optional): "volume1"
* year: "2020"
* section: "offers"
* subPath (optional): month or week examples: "/march"  or  "/52"


### meta object

```js

{

   _id, // 233a657e90a457e623ed767d96e68a
   created
   updated
   filename // 123_invoice.pdf

   apptype
   description
   previewPic

   versions: [{path, size, date, version, extension, mimetype, user, comment, hash, locked, deleted, meta}]
   // path like 2018/articles/march/12324_invoice_3e4243ac6b3244c656c227a.pdf
   // comment: force user to comment, when a file is added after order
   // hash auto generated for sharing
   // size in byte

   meta // object can hold additional info like "approved" or "paid" for accounting

   // additional ids
   accountId
   orderId
   positionId
   taskListId
   articleId
   noteId
}

```
