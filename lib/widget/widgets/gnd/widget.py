import re
from widget.lib.widget_base import WidgetBase
import sqlite3

class GndParams:
	def __init__(self, params):
		# the P object
		self.P = {}
		# from the query string
		self.db = params.get("gnn-id", params.get("direct-id", "")) + ".sqlite"
		self.my_id = params.get("gnn-id", params.get("direct-id", ""))
		self.gnn_key = params.get("key", "")
		self.gnn_name = "job #" + self.my_id
		self.gnn_title = self.gnn_name
		self.gnn_download_name = self.my_id
		self.uniref_version = params.get("id-type", "")
		self.uniref_id = params.get("uniref-id", "")

		# from the database
		self.gnn_window = 10
		self.gnn_type = ""

		self.has_unmatched_ids = False
		self.unmatched_ids = []
		self.unmatched_id_modal_text = ""

		self.is_direct_job = True if "direct-id" in params and "type" in params else False

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
	
	def get_realtime_params(self):
		self.P["id_key_query_string"] = "mode=rt"
		self.P["gnn_name_text"] = "A"
		self.P["window_title"] = ""
		self.P["is_realtime_job"] = True
		self.P["gnn_id"] = -1
		self.P["gnn_key"] = ""
		return True

	# copied over exactly from efi-web
	def get_ids_from_accessions(self):
		ids = []
		rows = self.fetch_data("SELECT accession FROM attributes ORDER BY accession")
		for row in rows:
			ids.append(row[0])
		return ids
	
	# copied over exactly from efi-web
	def get_ids_from_match_table(self):
		ids = {}
		rows = self.fetch_data("SELECT uniprot_id, id_list FROM matched ORDER BY uniprot_id")
		for row in rows:
			ids[row[0]] = row[1]
		return ids
	
	# copied over exactly from efi-web
	def get_uniprot_ids(self):
		ids = []
		if not self.check_table_exists("matched"):
			raw_ids = self.get_ids_from_accessions()
			for raw_id in raw_ids:
				ids.append(raw_id)
		else:
			ids = self.get_ids_from_match_table()
		return ids
	
	def set_is_direct_job(self):
		pass

	def retrieve_info(self):
		name = self.fetch_data("SELECT name FROM metadata")[0][0]
		if name != None and name != "":
			self.gnn_name = "<i>" + name + "</i>"
			self.gnn_title = name + " #(" + self.my_id + ")"
			self.gnn_download_name += "_" + name

		window = self.fetch_data("SELECT neighborhood_size FROM metadata")[0][0]
		if window != None and window != "":
			self.gnn_window = window

		type = self.fetch_data("SELECT type FROM metadata")[0][0]
		if type != None and type != "" and type == "BLAST":
			self.gnn_type = "Sequence BLAST"
		elif type != None and type != "" and type == "FASTA":
			self.gnn_type = "FASTA header ID lookup"
		elif type != None and type != "" and type == "ID_LOOKUP":
			self.gnn_type = "Sequence ID lookup"
		elif type != None and type != "" and type == "gnn":
			self.gnn_type = "GNN"
		else:
			# TODO: else what is the type??
			self.is_direct_job = False

		self.has_unmatched_ids = self.check_table_exists("unmatched")
		if self.has_unmatched_ids:
			column = self.fetch_data("SELECT id_list FROM unmatched")
			for val in column:
				self.unmatched_ids.append(val[0])
				self.unmatched_id_modal_text += "<div>" + val[0] + "</div>"

		self.uniprot_ids = self.get_uniprot_ids()
		content = "UniProt ID\tQuery ID\n"
		for upId, otherId in self.uniprot_ids.items():
			content += f"{upId}\t{otherId}\n"
		self.uniprot_ids_modal_text = content

		res = {
			"window": self.gnn_window,
			"type": self.gnn_type,
			"id": self.my_id,
			"key": self.gnn_key,
			"name": self.gnn_name,
			"title": self.gnn_title,
			"download_name": self.gnn_download_name,
			"has_unmatched_ids": self.has_unmatched_ids,
			"unmatched_ids": self.unmatched_ids,
			"unmatched_id_modal_text": self.unmatched_id_modal_text,
			"uniprot_ids": self.uniprot_ids,
			"uniprot_ids_modal_text": self.uniprot_ids_modal_text
		}
		print(res)
		return res

# class GNDFiles:
#   def __init__(self, file_type):
#     self.file_type = file_type
# 		if file_type == "unmatched_ids":
# 			params = GndParams(params)

#   def download_file(self):

class Widget(WidgetBase):
	def context(self):
		possible_params = ['direct-id', 'gnn-id', 'key', 'id-type', 'uniref-id']
		params = {}
		for param in possible_params:
			if self.has_param(param):
				params[param] = self.get_param(param)
		gnd_params = GndParams(params)
		return gnd_params.retrieve_info()
