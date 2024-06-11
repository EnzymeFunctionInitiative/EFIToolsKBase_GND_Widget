from widget.lib.widget_base import WidgetBase
import sqlite3

class GndParams:
	def __init__(self, params):
		# the P object
		self.P = {}
		# from the query string
		self.db = params.get("gnn-id", params.get("direct-id", params.get("upload-id", ""))) + ".sqlite"
		self.P["is_uploaded_diagram"] = "upload-id" in params
		self.P["gnn_id"] = params.get("gnn-id", params.get("direct-id", ""))
		self.P["gnn_key"] = params.get("key", "")
		self.P["gnn_name"] = "job #" + self.P["gnn_id"]
		self.P["gnn_title"] = self.P["gnn_name"]
		self.P["gnn_download_name"] = str(self.P["gnn_id"]) + "_"
		self.P["uniref_version"] = params.get("id-type", "")
		self.P["uniref_id"] = params.get("uniref-id", "")

		# from the database
		self.P["nb_size"] = 10
		self.P["gnn_type"] = ""
		self.P["supports_download"] = True
		self.P["is_blast"] = False

		# unmatched ids
		self.P["has_unmatched_ids"] = False
		self.P["unmatched_ids"] = []
		self.P["unmatched_id_modal_text"] = ""

		# uniprot ids
		# blast sequence

		# things that have to be calculated
		self.P["is_direct_job"] = True if "direct-id" in params and "type" in params else False

		# not important
		self.P["is_example"] = False

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
		self.P["nb_size_title"] = ""
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

	def retrieve_info(self):
		name = self.fetch_data("SELECT name FROM metadata")[0][0]
		if name != None and name != "":
			self.P["gnn_name"] = "<i>" + name + "</i>"
			self.P["gnn_title"] = name + " #(" + self.P["gnn_id"] + ")"
			self.P["gnn_download_name"] += name

		nb_size = self.fetch_data("SELECT neighborhood_size FROM metadata")[0][0]
		if nb_size != None and nb_size != "":
			self.P["nb_size"] = nb_size

		type = self.fetch_data("SELECT type FROM metadata")[0][0]
		if type == "BLAST":
			self.P["gnn_type"] = "Sequence BLAST"
			self.P["is_blast"] = True
		elif type == "FASTA":
			self.P["gnn_type"] = "FASTA header ID lookup"
		elif type == "ID_LOOKUP":
			self.P["gnn_type"] = "Sequence ID lookup"
		elif type == "gnn":
			self.P["gnn_type"] = "GNN"
		else:
			self.P["is_direct_job"] = False

		self.P["has_unmatched_ids"] = self.check_table_exists("unmatched")
		if self.P["has_unmatched_ids"]:
			column = self.fetch_data("SELECT id_list FROM unmatched")
			for val in column:
				self.P["unmatched_ids"].append(val[0])
				self.P["unmatched_id_modal_text"] += "<div>" + val[0] + "</div>"

		self.P["uniprot_ids"] = self.get_uniprot_ids()
		content = "UniProt ID\tQuery ID\n"
		for upId, otherId in self.P["uniprot_ids"].items():
			content += f"{upId}\t{otherId}\n"
		self.P["uniprot_ids_modal_text"] = content

		self.P["blast_seq"] = self.fetch_data("SELECT sequence FROM metadata")[0][0]

		return self.P

class Widget(WidgetBase):
	def context(self):
		possible_params = ["direct-id", "gnn-id", "key", "id-type", "uniref-id"]
		params = {}
		for param in possible_params:
			if self.has_param(param):
				params[param] = self.get_param(param)
		gnd_params = GndParams(params)
		return gnd_params.retrieve_info()
