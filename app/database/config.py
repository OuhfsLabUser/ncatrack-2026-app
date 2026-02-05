import os
from configparser import ConfigParser

def load_config(filename=None, section='postgresql'):
        current_directory = os.path.dirname(os.path.abspath(__file__))
        
        if filename is None:
            filename = os.path.join(current_directory, "database.ini")
        else:
            filename = os.path.join(current_directory, filename)
        
        parser = ConfigParser()
        parser.read(filename)

        config = {}
        if parser.has_section(section):
            params = parser.items(section)
            for param in params:
                config[param[0]] = param[1]
        else:
             raise Exception(f'Section {section} not found in the {filename} file')

        return config


if __name__ == '__main__':
     config = load_config()
     print(config)