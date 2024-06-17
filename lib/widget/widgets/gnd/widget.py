import json
from widget.lib.widget_base import WidgetBase
import sqlite3

class GndParams:
	def __init__(self, params):
		# the P object
		self.P = {}

		# internal variables
		self.id_param = [param for param in params if param.endswith("-id")][0]
		self.db = params.get(self.id_param) + ".sqlite"

		# from the query string
		self.P["gnn_id"] = params.get(self.id_param)
		self.P["gnn_key"] = params.get("key", "")
		self.P["gnn_name"] = "job #" + self.P["gnn_id"]
		self.P["window_title"] = "for job #" + self.P["gnn_id"]
		self.P["gnn_download_name"] = str(self.P["gnn_id"]) + "_"
		self.P["uniref_version"] = params.get("id-type", "")
		self.P["uniref_id"] = params.get("uniref-id", "")

		# from the database
		self.P["nb_size"] = 10
		self.P["gnn_type"] = ""
		self.P["supports_download"] = "true" if self.id_param == "direct-id" else "false"
		self.P["is_blast"] = "false"
		self.P["is_interpro_enabled"] = "false"
		self.P["is_bigscape_enabled"] = "false"
		self.P["cooccurrence"] = 20

		# job type
		self.P["is_uploaded_diagram"] = "true" if "upload-id" in params else "false"
		self.P["is_superfamily_job"] = "true" if "rs-id" in params else "false"
		self.P["is_direct_job"] = "true" if "direct-id" in params else "false"
		self.P["is_realtime_job"] = "false"

		# unmatched ids
		self.P["has_unmatched_ids"] = "false"
		self.P["unmatched_ids"] = []
		self.P["unmatched_id_modal_text"] = ""

		# uniprot ids

		# blast sequence
		self.P["blast_seq"] = ""

		# not important
		self.P["is_example"] = "false"
		self.P["bigscape_type"] = ""
		self.P["bigscape_btn_icon"] = ""
		self.P["bigscape_status"] = ""
		self.P["bigscape_btn_text"] = ""
		self.P["bigscape_modal_close_text"] = ""
		self.P["max_nb_size"] = 20

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
		return "true" if result is not None else "false"
	
	def get_realtime_params(self):
		self.P["id_key_query_string"] = "mode=rt"
		self.P["gnn_name_text"] = "A"
		self.P["nb_size_title"] = ""
		self.P["is_realtime_job"] = "true"
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
			self.P["gnn_name"] = "<i>" + name + "</i>" if self.id_param != "gnn-id" else "GNN <i>" + name + "</i>"
			self.P["gnn_download_name"] += name
			self.P["window_title"] = "for GNN " + name + " (#" + self.P["gnn_id"] + ")" if self.id_param == "gnn-id" else "for " + name + " (#" + self.P["gnn_id"] + ")"
		nb_size = self.fetch_data("SELECT neighborhood_size FROM metadata")[0][0]
		if nb_size != None and nb_size != "":
			self.P["nb_size"] = nb_size

		type = self.fetch_data("SELECT type FROM metadata")[0][0]
		if type == "BLAST":
			self.P["gnn_type"] = "Sequence BLAST"
			# this convention is not great but it is a workaround so we can use the resulting value as a boolean
			# in both the Jinja2 and JavaScript
			self.P["is_blast"] = "true"
		elif type == "FASTA":
			self.P["gnn_type"] = "FASTA header ID lookup"
		elif type == "ID_LOOKUP":
			self.P["gnn_type"] = "Sequence ID lookup"
		elif type == "gnn":
			self.P["gnn_type"] = "GNN"
		else:
			self.P["is_direct_job"] = "false"

		self.P["has_unmatched_ids"] = self.check_table_exists("unmatched")
		if self.P["has_unmatched_ids"] == "true":
			column = self.fetch_data("SELECT id_list FROM unmatched")
			for val in column:
				self.P["unmatched_ids"].append(val[0])
				self.P["unmatched_id_modal_text"] += "<div>" + val[0] + "</div>"

		if self.P["gnn_type"] != "GNN":
			self.P["uniprot_ids"] = self.get_uniprot_ids()

			
			download_text = "UniProt ID\tQuery ID\n"
			modal_text = ""
			for upId, otherId in self.P["uniprot_ids"].items():
				download_text += f"{upId}\t{otherId}\n"
				if upId == otherId:
					modal_text += f"<tr><td>{upId}</td><td></td></tr>"
				else:
					modal_text += f"<tr><td>{upId}</td><td>{otherId}</td></tr>"
			self.P["uniprot_ids_download_text"] = download_text
			self.P["uniprot_ids_modal_text"] = modal_text

		self.P["blast_seq"] = self.fetch_data("SELECT sequence FROM metadata")[0][0]
		cooccurrence = self.fetch_data("SELECT cooccurrence FROM metadata")[0][0]
		if cooccurrence != None:
			self.P["cooccurrence"] = int(cooccurrence * 100)
		
		self.P["id_key_query_string"] = f"{self.id_param}={self.P['gnn_id']}&key={self.P['gnn_key']}"
		# print(json.dumps(self.P, indent=2))
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
