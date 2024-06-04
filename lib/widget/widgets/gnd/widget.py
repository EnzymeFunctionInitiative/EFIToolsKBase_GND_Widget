from widget.lib.widget_base import WidgetBase
import sqlite3

class GndParams:
	def __init__(self, db, gnn_id, gnn_key):
		self.db = db
		self.gnn_id = gnn_id
		self.gnn_key = gnn_key

		self.gnn_window = 10
		self.gnn_name = "job #" + gnn_id
		self.gnn_type = "Sequence BLAST"
		self.gnn_title = self.gnn_name
		self.gnn_download_name = gnn_id

		self.has_unmatched_ids = False
		self.unmatched_ids = []
		self.unmatched_id_modal_text = ""

	def fetch_data(self, query):
		conn = sqlite3.connect(self.db)
		cursor = conn.cursor()
		cursor.execute(query)
		data = cursor.fetchall()
		cursor.close()
		conn.close()
		return data

	def check_table_exists(self, table_name):
		conn = sqlite3.connect(self.db)
		cursor = conn.cursor()
		cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name=?", (table_name,))
		result = cursor.fetchone()
		cursor.close()
		conn.close()
		return result is not None
	
	def retrieve_info(self):
		name = self.fetch_data("SELECT name FROM metadata")[0][0]
		if name != None and name != "":
			self.gnn_name = "<i>" + name + "</i>"
			self.gnn_title = name + " #(" + self.gnn_id + ")"
			self.gnn_download_name += "_" + name

		window = self.fetch_data("SELECT neighborhood_size FROM metadata")[0][0]
		if window != None and window != "":
			self.gnn_window = window

		type = self.fetch_data("SELECT type FROM metadata")[0][0]
		if type != None  and type != ""and type == "BLAST":
			self.gnn_type = "Sequence BLAST"
		if type != None  and type != ""and type == "FASTA":
			self.gnn_type = "FASTA header ID lookup"
		if type != None  and type != ""and type == "ID_LOOKUP":
			self.gnn_type = "Sequence ID lookup"

		self.has_unmatched_ids = self.check_table_exists("unmatched")
		if self.has_unmatched_ids:
			column = self.fetch_data("SELECT id_list FROM unmatched")
			for val in column:
				self.unmatched_ids.append(val[0])
				self.unmatched_id_modal_text += "<div>" + val[0] + "</div>"
		
		res = {
			"window": self.gnn_window,
			"type": self.gnn_type,
			"id": self.gnn_id,
			"key": self.gnn_key,
			"name": self.gnn_name,
			"title": self.gnn_title,
			"download_name": self.gnn_download_name,
			"has_unmatched_ids": self.has_unmatched_ids,
			"unmatched_ids": self.unmatched_ids,
			"unmatched_id_modal_text": self.unmatched_id_modal_text,
		}
		return res
    
class Widget(WidgetBase):
	def context(self):
		gnd_params = GndParams(self.get_param('direct-id') + ".sqlite", self.get_param("direct-id"), self.get_param("key"))
		return gnd_params.retrieve_info()
