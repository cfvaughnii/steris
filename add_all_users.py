from app import db, models

u = models.User(nickname='George', email='george_cossey@steris.com')
print u
db.session.add(u)
db.session.commit()
u = models.User(nickname='John', email='john_thomas@steris.com')
print u
db.session.add(u)
db.session.commit()
u = models.User(nickname='Frank', email='vaughn.frank@gmail.com')
print u
db.session.add(u)
db.session.commit()
u = models.User(nickname='Clifford', email='cfvaughnii@yahoo.com')
print u
db.session.add(u)
db.session.commit()


