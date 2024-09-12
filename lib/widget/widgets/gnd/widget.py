import json
from widget.lib.widget_base import WidgetBase
import sqlite3
from typing import Dict, List, Any, Optional, Tuple, Union
from contextlib import contextmanager
import hashlib
import os

@contextmanager
def db_connection(db_path):
  conn = sqlite3.connect(db_path)
  try:
    yield conn
  finally:
    conn.close()

class GndParams:
	def __init__(self, params: Dict[str, str]) -> None:
		# the P object
		self.P = {}

		# internal variables
		self.id_param = [param for param in params if param.endswith("-id")][0]
		self.db = params.get(self.id_param) + ".sqlite"
		self.query_cache = {}
		
		# from the query string
		self.P["param_type"] = self.id_param
		self.P["gnn_id"] = params.get(self.id_param)
		self.P["gnn_key"] = params.get("key", "")
		self.P["gnn_name"] = "job #" + self.P["gnn_id"]
		self.P["window_title"] = "for job #" + self.P["gnn_id"]
		self.P["gnn_download_name"] = str(self.P["gnn_id"]) + "_"
		self.P["uniref_version"] = params.get("id-type", "")
		self.P["uniref_id"] = params.get("uniref-id", "")
		self.P["id_type"] = params.get("id-type", "")

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
		self.P["is_direct_job"] = "true" if "direct-id" in params or "uniref-id" in params else "false"
		self.P["is_realtime_job"] = "false"

		# unmatched ids
		self.P["has_unmatched_ids"] = "false"
		self.P["unmatched_ids"] = []
		self.P["unmatched_id_modal_text"] = ""

		self.P["gene_graphics_file_name"] = ""
		
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

	def fetch_data(self, query: str, params: Optional[Tuple] = None) -> List[Tuple]:
		cache_key = hashlib.md5((query + str(params)).encode()).hexdigest()
		if cache_key in self.query_cache:
			return self.query_cache[cache_key]
		
		with db_connection(self.db) as conn:
			cursor = conn.cursor()
			if params:
				cursor.execute(query, params)
			else:
				cursor.execute(query)
			result = cursor.fetchall()
			self.query_cache[cache_key] = result
			return result

	def check_table_exists(self, table_name: str) -> str:
		conn = sqlite3.connect(self.db)
		cursor = conn.cursor()
		cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name=?", (table_name,))
		result = cursor.fetchone()
		cursor.close()
		conn.close()
		return "true" if result is not None else "false"

	def check_has_unmatched_ids(self) -> str:
		if self.check_table_exists("unmatched") == "false":
			return "false"
		num_tables = self.fetch_data("SELECT COUNT(*) FROM unmatched")[0][0]
		return "true" if num_tables > 0 else "false"
    
	# copied over exactly from efi-web
	def get_ids_from_accessions(self) -> List[str]:
		ids = []
		rows = self.fetch_data("SELECT accession FROM attributes ORDER BY accession")
		for row in rows:
			ids.append(row[0])
		return ids
	
	# copied over exactly from efi-web
	def get_ids_from_match_table(self) -> Dict[str, str]:
		ids = {}
		rows = self.fetch_data("SELECT uniprot_id, id_list FROM matched ORDER BY uniprot_id")
		for row in rows:
			ids[row[0]] = row[1]
		return ids
	
	# copied over exactly from efi-web
	def get_uniprot_ids(self) -> Union[List[str], Dict[str, str]]:
		ids = []
		if self.check_table_exists("matched") == "false":
			raw_ids = self.get_ids_from_accessions()
			for raw_id in raw_ids:
				ids.append(raw_id)
		else:
			ids = self.get_ids_from_match_table()
		return ids

	def retrieve_info(self) -> Dict[str, Any]:
		name = self.fetch_data("SELECT name FROM metadata")[0][0]
		if name != None and name != "":
			# this is for readability in the UI for long names, different screen widths
			name = name[:70] + "<br>" + name[70:] if len(name) > 70 else name
			self.P["gene_graphics_file_name"] = name
			if self.id_param == "upload-id":
				self.P["gnn_name"] = "filename <i>" + name + "</i>"
			elif self.id_param == "direct-id":
				self.P["gnn_name"] = "<i>" + name + "</i>"
			else:
				self.P["gnn_name"] = "GNN <i>" + name + "</i>"
			self.P["gnn_download_name"] += name
			if self.id_param == "gnn-id":
				self.P["window_title"] = "for GNN " + name + " (#" + self.P["gnn_id"] + ")"
			elif self.id_param == "upload-id":
				self.P["window_title"] = "for uploaded filename " + self.P["gnn_id"]
			else:
				"for " + name + " (#" + self.P["gnn_id"] + ")"
		nb_size = self.fetch_data("SELECT neighborhood_size FROM metadata")[0][0]
		if nb_size != None and nb_size != "":
			self.P["nb_size"] = nb_size

		type = self.fetch_data("SELECT type FROM metadata")[0][0]
		if type == "BLAST":
			self.P["gnn_type"] = "Sequence BLAST"
			# this convention is not great but it is a workaround so we can use the resulting value as a boolean in both the Jinja2 and JavaScript
			self.P["is_blast"] = "true"
		elif type == "FASTA":
			self.P["gnn_type"] = "FASTA header ID lookup"
		elif type == "ID_LOOKUP":
			self.P["gnn_type"] = "Sequence ID lookup"
		else:
			self.P["gnn_type"] = "GNN"

		self.P["has_unmatched_ids"] = self.check_has_unmatched_ids()
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
		
		# manually adding id type and uniref id to the query string
		self.P["id_key_query_string"] = f"{self.id_param}={self.P['gnn_id']}&key={self.P['gnn_key']}"
		if self.P["uniref_id"] != "": self.P["id_key_query_string"] += "&uniref-id=" + self.P['uniref_id']
		if self.P["id_type"] != "": self.P["id_key_query_string"] += "&id-type=" + self.P['id_type']

		# print(json.dumps(self.P, indent=2))
		return self.P

class Widget(WidgetBase):
	def context(self) -> Union[str, Dict[str, Any]]:
		possible_params = ["direct-id", "gnn-id", "upload-id", "key", "id-type", "uniref-id"]
		params = {}
		for param in possible_params:
			if self.has_param(param):
				params[param] = self.get_param(param)

		if not any(params.values()):
			return "Oops! No parameters provided."

		gnd_params = GndParams(params)
		return gnd_params.retrieve_info()
	
	def render(self) -> str:
		possible_params = ["direct-id", "gnn-id", "key", "id-type", "uniref-id"]
		for param in possible_params:
			if self.has_param(param):
				return super().render()
			
		file_path = os.path.join("data", "sample.txt")
		ls_output = "Contents of the data folder\n".join(os.listdir("data")) + "end of contents"

		if os.path.exists(file_path):
			try:
				with open(file_path, "r") as file:
					file_contents = file.read()
			except PermissionError:
				file_contents = "Error: Permission denied"
			except FileNotFoundError:
				file_contents = "Error: File not found"
		else:
			file_contents = "file not found"

		return """
		Welcome to the base GND endpoint. Enter params to query specific database files.
		<br>
		<br>
		Examples of possible URLs with params:
		<ul>
			<li><a href="?direct-id=30093&key=52eb593c2fed778dcfd6a2cf16d1f5ced3f3f617">?direct-id=30093&key=52eb593c2fed778dcfd6a2cf16d1f5ced3f3f617</a></li>
			<li><a href="?direct-id=30095&key=52eb593c2fed778dcfd6a2cf16d1f5ced3f3f617">?direct-id=30095&key=52eb593c2fed778dcfd6a2cf16d1f5ced3f3f617</a></li>
			<li><a href="?gnn-id=7671&key=52eb593c2fed778dcfd6a2cf16d1f5ced3f3f617">?gnn-id=7671&key=52eb593c2fed778dcfd6a2cf16d1f5ced3f3f617</a></li>
		</ul>
		""".encode("utf-8") + file_contents.encode("utf-8") + ls_output.encode("utf-8")
