from widget.lib.widget_base import WidgetBase
import sqlite3

class GndParams:
	def __init__(self, db, gnn_id, gnn_key):
		self.db = db
		self.gnn_id = gnn_id
		self.gnn_key = gnn_key

		self.gnn_window = 10
		self.gnn_name = "#" + gnn_id
		self.gnn_type = "Sequence BLAST"

	def fetch_data(self, query):
		conn = sqlite3.connect(self.db)
		cursor = conn.cursor()
		cursor.execute(query)
		data = cursor.fetchall()
		cursor.close()
		conn.close()
		return data

	def retrieve_info(self):
		name = self.fetch_data("SELECT name FROM metadata")[0][0]
		if name != None and name != "":
			self.gnn_name = name

		window = self.fetch_data("SELECT neighborhood_size FROM metadata")[0][0]
		if window != None and window != "":
			self.gnn_window = window

		type = self.fetch_data("SELECT type FROM metadata")[0][0]
		if type != None  and type != ""and type == "BLAST":
			self.gnn_type = "Sequence BLAST"
		if type != None  and type != ""and type == "FASTA":
			self.gnn_type = "FASTA header ID lookup"

		return {
			"name": self.gnn_name,
			"window": self.gnn_window,
			"type": self.gnn_type,
			"id": self.gnn_id,
			"key": self.gnn_key
		}
    
class Widget(WidgetBase):
	def context(self):
		gnd_params = GndParams("30093_.sqlite", self.get_param("direct-id"), self.get_param("key"))
		return gnd_params.retrieve_info()
