import React from 'react';
import {
  Table,
  TableCell,
  TableBody,
  TableHead,
  TableRow,
} from '@aws-amplify/ui-react';
import { BsXOctagonFill } from "react-icons/bs";
import { useEffect } from 'react';
import { API } from 'aws-amplify'
import { listTodos } from '../graphql/queries'

export const Todo = (props,) => {
  const { todoData } = props;
  useEffect(() => {
    try {
      const fetchTodos = async () => {
        const res = await API.graphql({
          query: listTodos,
          authToken: "custom-authorized"
        })
        return res.data.listTodos.todos
      }

      fetchTodos().then(todos => props.setTodoData(todos))

    } catch (error) {
      console.log(error)
    }

  }, [])

  return (
    <Table
      textAlign="left"
      size="small"
      caption=""
      highlightOnHover={false}>
      <TableHead>
        <TableRow size="small">
          <TableCell width="14%" as="th">Name</TableCell>
          <TableCell width="15%" as="th">Description</TableCell>
          <TableCell width="14%" as="th">Priority</TableCell>
          <TableCell width="14%" as="th">Created At</TableCell>
          <TableCell width="14%" as="th">Created In</TableCell>
          <TableCell width="14%" as="th">Status</TableCell>
          <TableCell width="14%" as="th">Remove</TableCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {todoData.map((row) => (
          <TableRow
            key={row.id}
            sx={{ '&:last-child td, &:last-child th': { border: 0 } }}
          >
            <TableCell align="right">{row.name}</TableCell>
            <TableCell align="right">{row.description}</TableCell>
            <TableCell align="right">{row.priority}</TableCell>
            <TableCell align="right">{row.createdAt}</TableCell>
            <TableCell align="right">{row.createdInRegion}</TableCell>
            <TableCell align="right">{row.status}</TableCell>
            <TableCell align="right">
              <BsXOctagonFill
                onClick={() => props.removeTodo(row.id)}
                className='delete-icon'
                cursor="pointer"
              />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table >
  )

}
