from app import db, models
users = models.User.query.all()
for u in users:
	print "Delete ", u.nickname, u.email
	db.session.delete(u)
posts = models.Post.query.all()
for p in posts:
	print "Delete ", p.u_id
	db.session.delete(p)

db.session.commit()
